#!/usr/bin/env node

/**
 * License Header Checker
 * Verifies that all TypeScript files have proper license headers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIT_HEADER = '@license MIT';
const PROPRIETARY_HEADER = '@license Proprietary';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const checkDirectory = (dir, expectedLicense, packageName) => {
  if (!fs.existsSync(dir)) {
    return { errors: [], warnings: [`Directory not found: ${dir}`], checked: 0 };
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  const errors = [];
  const warnings = [];
  let checked = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const result = checkDirectory(fullPath, expectedLicense, packageName);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      checked += result.checked;
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      checked++;
      const content = fs.readFileSync(fullPath, 'utf-8');
      const first1000 = content.substring(0, 1000);
      
      if (!first1000.includes(expectedLicense)) {
        errors.push({
          file: path.relative(path.join(__dirname, '..'), fullPath),
          package: packageName,
          expected: expectedLicense,
        });
      }
    }
  }
  
  return { errors, warnings, checked };
};

console.log(`${COLORS.blue}🔍 Checking license headers...${COLORS.reset}\n`);

// Check core package (MIT)
const coreResult = checkDirectory(
  path.join(__dirname, '../packages/core/src'),
  MIT_HEADER,
  '@ascii-motion/core'
);

// Check premium package (Proprietary)
const premiumResult = checkDirectory(
  path.join(__dirname, '../packages/premium/src'),
  PROPRIETARY_HEADER,
  '@ascii-motion/premium'
);

const totalErrors = [...coreResult.errors, ...premiumResult.errors];
const totalWarnings = [...coreResult.warnings, ...premiumResult.warnings];
const totalChecked = coreResult.checked + premiumResult.checked;

// Display results
console.log(`${COLORS.blue}Summary:${COLORS.reset}`);
console.log(`  Files checked: ${totalChecked}`);
console.log(`  Core package: ${coreResult.checked} files`);
console.log(`  Premium package: ${premiumResult.checked} files\n`);

if (totalWarnings.length > 0) {
  console.log(`${COLORS.yellow}⚠️  Warnings:${COLORS.reset}`);
  totalWarnings.forEach(warning => {
    console.log(`  ${COLORS.yellow}•${COLORS.reset} ${warning}`);
  });
  console.log('');
}

if (totalErrors.length > 0) {
  console.log(`${COLORS.red}❌ License header errors found:${COLORS.reset}\n`);
  
  totalErrors.forEach(({ file, package: pkg, expected }) => {
    console.log(`  ${COLORS.red}✗${COLORS.reset} ${file}`);
    console.log(`    Package: ${pkg}`);
    console.log(`    Missing: ${expected}\n`);
  });
  
  console.log(`${COLORS.yellow}To fix, add the appropriate header to each file:${COLORS.reset}\n`);
  
  console.log(`${COLORS.green}For MIT files (core package):${COLORS.reset}`);
  console.log(`/**
 * ASCII Motion - Open Source ASCII Art Editor
 * 
 * @license MIT
 * @copyright 2025 ASCII Motion
 * @see LICENSE-MIT for full license text
 */\n`);
  
  console.log(`${COLORS.blue}For Proprietary files (premium package):${COLORS.reset}`);
  console.log(`/**
 * ASCII Motion - Premium Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE-PREMIUM for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying, distribution, or use is prohibited.
 */\n`);
  
  process.exit(1);
} else {
  console.log(`${COLORS.green}✅ All files have proper license headers!${COLORS.reset}`);
  process.exit(0);
}
