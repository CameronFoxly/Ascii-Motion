import {
  BRIDGE_CONTRACT_VERSION,
  BRIDGE_DEFS,
  BRIDGE_ERROR_CODES,
  BRIDGE_MESSAGES,
  BRIDGE_OPERATIONS,
  BRIDGE_PROTOCOL,
  BRIDGE_PROTOCOL_VERSION,
} from './operations';

/**
 * Build the portable contract document. The hash covers everything except
 * the hash itself, so any schema/name change produces a new hash.
 */
export function buildBridgeContract(sha256: (text: string) => string) {
  const body = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    protocol: BRIDGE_PROTOCOL,
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    contractVersion: BRIDGE_CONTRACT_VERSION,
    timeModel: 'All frame fields are absolute 0-based integer timeline frames. Content frames are addressed by contentFrameId.',
    errorCodes: [...BRIDGE_ERROR_CODES],
    messages: BRIDGE_MESSAGES,
    $defs: BRIDGE_DEFS,
    operations: BRIDGE_OPERATIONS,
  };
  const contractHash = sha256(JSON.stringify(body));
  return { ...body, contractHash };
}
