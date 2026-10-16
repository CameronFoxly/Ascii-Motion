/**
 * Minimal JSON Schema (2020-12 subset) builders and runtime validator.
 *
 * The bridge contract is authored in TypeScript with these builders, emitted
 * verbatim into `bridge-contract.json`, and validated at runtime in the browser
 * with `validateSchema`. External consumers (the MCP server) can validate the
 * same JSON with any standard validator (e.g. Ajv) because only standard
 * keywords are used.
 *
 * Supported keywords: type, properties, required, additionalProperties, enum,
 * const, minimum, maximum, minLength, maxLength, pattern, items, minItems,
 * maxItems, minProperties, oneOf, anyOf, $ref (local "#/$defs/<name>"),
 * description, default.
 */

export type JsonSchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  description?: string;
  default?: unknown;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  enum?: readonly unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minProperties?: number;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  $ref?: string;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

type Opts = Omit<JsonSchema, 'type'>;

export const str = (opts: Opts = {}): JsonSchema => ({ type: 'string', ...opts });
export const int = (opts: Opts = {}): JsonSchema => ({ type: 'integer', ...opts });
export const num = (opts: Opts = {}): JsonSchema => ({ type: 'number', ...opts });
export const bool = (opts: Opts = {}): JsonSchema => ({ type: 'boolean', ...opts });
export const enumOf = (values: readonly string[], opts: Opts = {}): JsonSchema => ({ type: 'string', enum: values, ...opts });
export const arr = (items: JsonSchema, opts: Opts = {}): JsonSchema => ({ type: 'array', items, ...opts });
export const ref = (name: string): JsonSchema => ({ $ref: `#/$defs/${name}` });
export const oneOf = (...schemas: JsonSchema[]): JsonSchema => ({ oneOf: schemas });
export const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] });
/** Free-form JSON value */
export const anyValue = (description?: string): JsonSchema => (description ? { description } : {});
/** Free-form JSON object (record) */
export const record = (description?: string, values?: JsonSchema): JsonSchema => ({
  type: 'object',
  additionalProperties: values ?? true,
  ...(description ? { description } : {}),
});

/**
 * Strict object: `required` lists required keys, every other key in `props` is
 * optional, and unknown keys are rejected.
 */
export const obj = (
  props: Record<string, JsonSchema>,
  required: string[] = [],
  opts: Opts = {},
): JsonSchema => ({
  type: 'object',
  properties: props,
  ...(required.length ? { required } : {}),
  additionalProperties: false,
  ...opts,
});

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export interface SchemaIssue {
  path: string;
  message: string;
}

function typeOf(value: unknown): JsonSchemaType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value as JsonSchemaType;
}

function matchesType(value: unknown, type: JsonSchemaType): boolean {
  const actual = typeOf(value);
  if (type === 'number') {
    return (actual === 'number' || actual === 'integer') && Number.isFinite(value as number);
  }
  return actual === type;
}

function resolveRef(ref: string, defs: Record<string, JsonSchema>): JsonSchema {
  const prefix = '#/$defs/';
  if (!ref.startsWith(prefix)) throw new Error(`Unsupported $ref "${ref}"`);
  const target = defs[ref.slice(prefix.length)];
  if (!target) throw new Error(`Unknown $ref "${ref}"`);
  return target;
}

const MAX_ISSUES = 20;

function validateInto(
  value: unknown,
  schema: JsonSchema,
  defs: Record<string, JsonSchema>,
  path: string,
  issues: SchemaIssue[],
): void {
  if (issues.length >= MAX_ISSUES) return;
  if (schema.$ref) {
    validateInto(value, resolveRef(schema.$ref, defs), defs, path, issues);
    return;
  }

  const branches = schema.oneOf ?? schema.anyOf;
  if (branches) {
    const branchIssues = branches.map((branch) => {
      const local: SchemaIssue[] = [];
      validateInto(value, branch, defs, path, local);
      return local;
    });
    const passing = branchIssues.filter((b) => b.length === 0).length;
    const ok = schema.oneOf ? passing === 1 : passing > 0;
    if (!ok) {
      if (passing > 1) {
        issues.push({ path, message: 'matches more than one allowed shape' });
      } else {
        // Report the closest branch (fewest issues) to keep errors actionable
        const closest = branchIssues.reduce((a, b) => (b.length < a.length ? b : a));
        issues.push(...closest.slice(0, MAX_ISSUES - issues.length));
      }
    }
    if (!schema.type && !schema.properties) return;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      issues.push({ path, message: `expected ${types.join(' | ')}, got ${typeOf(value)}` });
      return;
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    issues.push({ path, message: `must equal ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum && !schema.enum.includes(value)) {
    issues.push({ path, message: `must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}` });
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) issues.push({ path, message: `must be >= ${schema.minimum}` });
    if (schema.maximum !== undefined && value > schema.maximum) issues.push({ path, message: `must be <= ${schema.maximum}` });
  }

  if (typeof value === 'string') {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) issues.push({ path, message: `must have length >= ${schema.minLength}` });
    if (schema.maxLength !== undefined && length > schema.maxLength) issues.push({ path, message: `must have length <= ${schema.maxLength}` });
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) issues.push({ path, message: `must match ${schema.pattern}` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) issues.push({ path, message: `must have >= ${schema.minItems} items` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push({ path, message: `must have <= ${schema.maxItems} items` });
    if (schema.items) {
      for (let i = 0; i < value.length && issues.length < MAX_ISSUES; i++) {
        validateInto(value[i], schema.items, defs, `${path}[${i}]`, issues);
      }
    }
  }

  if (typeOf(value) === 'object') {
    const rec = value as Record<string, unknown>;
    if (schema.minProperties !== undefined && Object.keys(rec).length < schema.minProperties) {
      issues.push({ path, message: `must have at least ${schema.minProperties} properties` });
    }
    for (const key of schema.required ?? []) {
      if (rec[key] === undefined) issues.push({ path: `${path}.${key}`, message: 'is required' });
    }
    const props = schema.properties ?? {};
    for (const [key, child] of Object.entries(rec)) {
      if (child === undefined) continue;
      if (props[key]) {
        validateInto(child, props[key], defs, `${path}.${key}`, issues);
      } else if (schema.additionalProperties === false) {
        issues.push({ path: `${path}.${key}`, message: 'is not an allowed property' });
      } else if (typeof schema.additionalProperties === 'object') {
        validateInto(child, schema.additionalProperties, defs, `${path}.${key}`, issues);
      }
    }
  }
}

export function validateSchema(
  value: unknown,
  schema: JsonSchema,
  defs: Record<string, JsonSchema> = {},
  rootPath = 'input',
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  validateInto(value, schema, defs, rootPath, issues);
  return issues;
}
