## What

<!-- What changed and why. -->

## Testing

<!-- Commands run, manual checks, screenshots for UI changes. -->

## MCP impact

Every user-facing authoring, animation, import/export, or project change must keep
[ascii-motion-mcp](https://github.com/CameronFoxly/ascii-motion-mcp) in sync. See
`docs/MCP_BRIDGE_CONTRACT.md`.

- [ ] **None**: no user-facing feature, document field, tool, format, or catalog change
- [ ] **Supported**: already covered by existing bridge operations (name them):
- [ ] **Changed/new**: updated `src/mcp/contract/operations.ts`, the handler, `src/mcp/contract/coverage.ts`, and tests; ran `npm run mcp:contract`
- [ ] **Excluded**: classified in `coverage.ts` with a reason (account/billing/admin, or a justified limit)
- [ ] Contract hash changed → companion ascii-motion-mcp PR:
- [ ] User-facing MCP docs changed → companion docs (`packages/web`) PR:
