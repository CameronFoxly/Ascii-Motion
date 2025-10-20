#!/usr/bin/env node

/**
 * Monorepo Migration Helper
 * Helps migrate existing src/ code to packages/core/src/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`${COLORS.cyan}
╔═══════════════════════════════════════════════════════════╗
║  ASCII Motion - Monorepo Migration Helper                 ║
╚═══════════════════════════════════════════════════════════╝
${COLORS.reset}`);

console.log(`\n${COLORS.blue}This script will help you migrate to the monorepo structure.${COLORS.reset}\n`);

// Check current structure
const srcExists = fs.existsSync(path.join(rootDir, 'src'));
const coreExists = fs.existsSync(path.join(rootDir, 'packages/core/src'));
const premiumExists = fs.existsSync(path.join(rootDir, 'packages/premium/src'));

console.log(`${COLORS.blue}Current Status:${COLORS.reset}`);
console.log(`  ${srcExists ? '✓' : '✗'} src/ directory exists`);
console.log(`  ${coreExists ? '✓' : '✗'} packages/core/src/ exists`);
console.log(`  ${premiumExists ? '✓' : '✗'} packages/premium/src/ exists`);
console.log('');

if (!srcExists) {
  console.log(`${COLORS.red}Error: src/ directory not found. Nothing to migrate.${COLORS.reset}`);
  process.exit(1);
}

console.log(`${COLORS.yellow}⚠️  IMPORTANT: This is a MANUAL migration guide.${COLORS.reset}`);
console.log(`${COLORS.yellow}   We won't move files automatically to avoid breaking your project.${COLORS.reset}\n`);

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 1: Backup Your Code                                 ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Run these commands:\n`);
console.log(`  ${COLORS.cyan}git add .${COLORS.reset}`);
console.log(`  ${COLORS.cyan}git commit -m "Backup before monorepo migration"${COLORS.reset}`);
console.log(`  ${COLORS.cyan}git branch backup-pre-monorepo${COLORS.reset}`);
console.log('');

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 2: Move Core Files                                  ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

const filesToMove = [
  { from: 'src/components', to: 'packages/core/src/components', type: 'directory' },
  { from: 'src/hooks', to: 'packages/core/src/hooks', type: 'directory' },
  { from: 'src/stores', to: 'packages/core/src/stores', type: 'directory' },
  { from: 'src/utils', to: 'packages/core/src/utils', type: 'directory' },
  { from: 'src/constants', to: 'packages/core/src/constants', type: 'directory' },
];

console.log(`Run these commands:\n`);
filesToMove.forEach(({ from, to }) => {
  const exists = fs.existsSync(path.join(rootDir, from));
  if (exists) {
    console.log(`  ${COLORS.cyan}mkdir -p ${to}${COLORS.reset}`);
    console.log(`  ${COLORS.cyan}cp -r ${from}/* ${to}/${COLORS.reset}`);
  } else {
    console.log(`  ${COLORS.yellow}# ${from} not found, skipping${COLORS.reset}`);
  }
});
console.log('');

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 3: Add License Headers                              ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Add this header to ALL files in packages/core/src/:\n`);
console.log(`${COLORS.cyan}/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */${COLORS.reset}\n`);

console.log(`You can use this VS Code snippet:`);
console.log(`  1. Open settings.json (Cmd+Shift+P → "Open User Settings JSON")`);
console.log(`  2. Add the snippet from docs/MONOREPO_SETUP_GUIDE.md\n`);

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 4: Create Core Package Index                        ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Create ${COLORS.cyan}packages/core/src/index.ts${COLORS.reset} with exports:\n`);
console.log(`${COLORS.cyan}/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */

// Export all components
export * from './components';

// Export all hooks
export * from './hooks';

// Export all stores
export * from './stores';

// Export all utils
export * from './utils';

// Export all constants
export * from './constants';${COLORS.reset}\n`);

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 5: Update Imports in Main App                       ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Replace imports in ${COLORS.cyan}src/${COLORS.reset} files:\n`);
console.log(`${COLORS.red}// OLD${COLORS.reset}`);
console.log(`${COLORS.red}import { CanvasGrid } from './components/CanvasGrid';${COLORS.reset}`);
console.log(`${COLORS.red}import { useCanvasStore } from './stores/canvasStore';${COLORS.reset}\n`);

console.log(`${COLORS.green}// NEW${COLORS.reset}`);
console.log(`${COLORS.green}import { CanvasGrid } from '@ascii-motion/core/components/CanvasGrid';${COLORS.reset}`);
console.log(`${COLORS.green}import { useCanvasStore } from '@ascii-motion/core/stores/canvasStore';${COLORS.reset}\n`);

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 6: Update Vite Config                               ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Update ${COLORS.cyan}vite.config.ts${COLORS.reset}:\n`);
console.log(`${COLORS.cyan}export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ascii-motion/core': path.resolve(__dirname, './packages/core/src'),
      '@ascii-motion/premium': path.resolve(__dirname, './packages/premium/src'),
    },
  },
  // ... rest of config
});${COLORS.reset}\n`);

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 7: Install Dependencies                             ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Run:\n`);
console.log(`  ${COLORS.cyan}rm -rf node_modules${COLORS.reset}`);
console.log(`  ${COLORS.cyan}npm install${COLORS.reset}`);
console.log('');

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 8: Test Everything                                  ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`Run:\n`);
console.log(`  ${COLORS.cyan}npm run build:packages${COLORS.reset}  # Build core + premium`);
console.log(`  ${COLORS.cyan}npm run dev${COLORS.reset}             # Start dev server`);
console.log(`  ${COLORS.cyan}npm run check-licenses${COLORS.reset} # Verify license headers`);
console.log('');

console.log(`${COLORS.green}╔═══════════════════════════════════════════════════════════╗`);
console.log(`║  Step 9: Clean Up Old Files (Optional)                    ║`);
console.log(`╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

console.log(`${COLORS.yellow}⚠️  Only do this AFTER verifying everything works!${COLORS.reset}\n`);
console.log(`  ${COLORS.cyan}rm -rf src/components${COLORS.reset}`);
console.log(`  ${COLORS.cyan}rm -rf src/hooks${COLORS.reset}`);
console.log(`  ${COLORS.cyan}rm -rf src/stores${COLORS.reset}`);
console.log(`  ${COLORS.cyan}rm -rf src/utils${COLORS.reset}`);
console.log(`  ${COLORS.cyan}rm -rf src/constants${COLORS.reset}`);
console.log('');

console.log(`${COLORS.green}✅ Migration guide complete!${COLORS.reset}`);
console.log(`\nFor detailed information, see: ${COLORS.cyan}docs/MONOREPO_SETUP_GUIDE.md${COLORS.reset}\n`);
