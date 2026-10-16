# MCP bridge contract (browser ⇄ ascii-motion-mcp)

The browser app is the authority for live MCP sessions. The
[`ascii-motion-mcp`](https://github.com/CameronFoxly/ascii-motion-mcp) server
connects over a loopback WebSocket. It sends validated operations, and the app
runs them through its own stores, exporters and renderers. MCP keeps a typed
mirror of the native document for headless editing and saving. It never
re-implements app rendering.

| Artifact | Purpose |
| --- | --- |
| `src/mcp/contract/operations.ts` | Source of truth: operations, JSON Schemas, messages, error codes |
| `src/mcp/contract/bridge-contract.json` | **Generated** portable contract consumed by MCP (Ajv validation + tool generation) |
| `src/mcp/contract/contractHash.generated.ts` | **Generated** hash the browser announces in `hello` |
| `src/mcp/contract/coverage.ts` → `src/mcp/coverage-manifest.json` | Feature → operation coverage manifest (generated JSON) |
| `docs/MCP_BRIDGE_OPERATIONS.md` | **Generated** operation reference |
| `src/mcp/operations/runtime.ts` | Executor: validation, revisions, rollback, one undo entry, `apply_operations` |
| `src/mcp/operations/handlers/*` | Operation handlers that reuse app stores/utilities |
| `src/mcp/legacyAdapters.ts` | Maps pre-v3 commands and state notifications onto canonical operations |
| `src/mcp/client.ts` | WebSocket client: `hello`, `op_request`, `command_request`, `state_request`, `doc_changed` |

## Protocol v3

On connect the browser sends `auth`, then `hello`. The `hello` message carries
`protocolVersion: 3`, `contractVersion`, `contractHash`, the app version, the
document identity (`documentId`, `revision`) and `capabilities`.

- **`op_request {requestId, op, input, expectedRevision?}`** → **`op_result {requestId, op, ok, result | error, revision, documentId}`**.
- **`command_request {requestId, protocolVersion: 3, expectedRevision?, command: {type: <op>, ...input}}`** → **`command_result {requestId, success, applied | error, errorCode, revision, documentId}`**.
  - A canonical name that also exists as a legacy command (`load_project`, `undo`, `resize_canvas`, generators, …) runs as a canonical operation only when `protocolVersion: 3` or `expectedRevision` is set, or after the connection is already in v3 mode.
- **`state_request {requestId}`** → **`state_snapshot`**, echoing `requestId`. The snapshot carries `document` (the native session), `documentId`, `revision`, `activeLayerId` and `currentFrame`, plus the legacy fields for older servers.
- **`doc_changed {documentId, revision, source}`** is sent (debounced) after any change from the UI, the bridge, undo/redo or a load.

Semantics:

- **Time:** every `frame` is an absolute 0-based timeline frame. Content frames are addressed by `contentFrameId`. Edits take an explicit `target` (`layerId`, `contentFrameId` or `frame`, plus `createIfMissing`) and never depend on what the UI has selected.
- **Revisions:** revisions only increase, for the lifetime of the page. `new`, `load` and `open` rotate `documentId`. A page reload starts a new runtime with a new `documentId`, so MCP must reset its cache on `hello` or whenever `documentId` changes.
- **Atomicity:** each mutation is validated, applied once, given exactly one undo entry and one revision bump, and is fully rolled back on failure. A mutation that changes nothing returns `noChange` and does not bump the revision.
- **`apply_operations`:** runs up to 100 operations as one atomic edit with one undo entry. It rejects nested batches, undo/redo, new/load and IO. It returns per-operation results and created `ids`.
- **Errors:** `INVALID_INPUT`, `UNKNOWN_OPERATION`, `NOT_FOUND`, `CONFLICT` (stale `expectedRevision`), `LOCKED`, `OUT_OF_RANGE`, `LIMIT_REACHED`, `AUTH_REQUIRED`, `ENTITLEMENT_REQUIRED`, `UI_NOT_READY`, `UNSUPPORTED`, `BUSY`, `INTERNAL`. Never report success for work that was not applied.
- **Import character ordering:** with brightness/by-index mapping and `invertDensity:false`, `import_media.settings.characterSet` maps dark source pixels to index 0 and bright source pixels to the last index. For example, `[" ", ".", "@"]` maps opaque black to a space and opaque white to `@`; `["@", ".", " "]` maps white to a space instead (an empty overlay cell when its background is transparent). The active character palette's `invertDensity` setting reverses this ordering. Do not reverse the array when translating a dark-to-bright charset.
- **Export frame metadata:** PNG/JPG/SVG results report `frameCount:1`; `sourceFrameCount` reports the source timeline's frame count before any export range is applied. Video and sequence results retain their exported-range frame count.
- **Import/export settings:** `export` settings accept only the options the app exporters read (`get_catalog export_formats`), and `import_media` settings accept only the options the conversion pipeline reads (`get_catalog tools.importSettings`). Unsupported keys and enum values are rejected with `INVALID_INPUT`, never ignored. Animated export formats take `frameRange: "all" | {start, end}` (inclusive; `end: -1` means the last frame). Shader blocks and keyframes are shifted onto the exported range. The export result reports the exported `frameRange` and any names the exporter derives (`componentName`; `packageName`/`modelName` for Bubble Tea). `import_media.video` sets the sampling window (`startTime`, `duration`, `frameRate`, `maxFrames`). Image-only `import_media mode:"overlay"` merges non-empty converted cells into the targeted content frame, preserving other artwork (including cells under empty converted pixels) in one revision/undo entry; video and multi-frame overlays return `INVALID_INPUT`. The default `new_layer` and explicit `replace` modes are unchanged. Layer groups need at least 2 ungrouped layers; the app has no empty groups.
- **`destructive: false`** means the operation is purely additive. Anything that overwrites, removes or replaces data is `destructive: true`. MCP derives tool annotations from this flag.

## Contributor workflow: keep MCP in sync

Any PR that adds or changes a user-facing feature must classify its MCP impact:
**changed**, **supported**, **new**, or **intentionally excluded** (with a reason).

1. **Operation:** add or extend the operation in `src/mcp/contract/operations.ts`, giving it a strict input schema and a typed result. Then implement it in `src/mcp/operations/handlers/<domain>.ts` by reusing the app action, not by copying logic. Changing a schema is a contract change.
2. **Coverage:** map the feature in `src/mcp/contract/coverage.ts`. New `Tool` values and export formats must be added to `TOOL_COVERAGE` / `EXPORT_FORMAT_COVERAGE`, or `tsc` fails. New effects, shaders and generators are exposed automatically through `get_catalog`, and `mcpCoverage.test.ts` adds each one.
3. **Generate:** run `npm run mcp:contract` and commit the regenerated JSON/doc files. CI runs `npm run mcp:contract:check`.
4. **Test:** add a behavioral fixture, usually in `src/__tests__/mcpOperations.test.ts`. Then run `npm run test:mcp`.
5. **Companion PRs:** if the contract hash changed, open a companion `ascii-motion-mcp` PR that syncs `bridge-contract.json`. Link the docs PR if user guides change (the docs site lives in the `packages/web` submodule).

Release order: merge the app first, then ship the MCP release pinned to the new contract hash, then update the `packages/web` docs and finally the gitlink.

Fork CI needs no secrets. Cloud and entitlement operations are tested with mocks; real auth flows are verified manually in a signed-in browser.
