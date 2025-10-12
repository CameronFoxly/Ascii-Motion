#!/bin/bash

# Script to set up premium package as a private Git submodule
# This allows version control for premium code while keeping core public

set -e  # Exit on error

echo "🔧 Setting up private premium repository..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Create private GitHub repository${NC}"
echo "================================================"
echo ""
echo "Go to: https://github.com/new"
echo ""
echo "Settings:"
echo "  - Repository name: Ascii-Motion-Premium"
echo "  - Description: Proprietary authentication and cloud features for ASCII Motion"
echo "  - Visibility: ⚠️  PRIVATE (very important!)"
echo "  - Do NOT initialize with README, .gitignore, or license"
echo ""
echo -e "${YELLOW}Press Enter after you've created the repository...${NC}"
read

echo ""
echo -e "${BLUE}Step 2: Backup current premium files${NC}"
echo "================================================"
echo ""

if [ -d "packages/premium/src" ]; then
    mkdir -p .backup-premium
    cp -r packages/premium/src .backup-premium/
    echo -e "${GREEN}✅ Backed up to .backup-premium/${NC}"
else
    echo -e "${YELLOW}No premium src files to backup${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Remove current premium directory${NC}"
echo "================================================"
echo ""

if [ -d "packages/premium" ]; then
    rm -rf packages/premium/src
    echo -e "${GREEN}✅ Removed packages/premium/src${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Clone private repo as submodule${NC}"
echo "================================================"
echo ""

# Get GitHub username (default to cameronfoxly)
read -p "Enter your GitHub username [cameronfoxly]: " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-cameronfoxly}

# Add submodule
echo "Adding submodule..."
if git submodule add git@github.com:${GITHUB_USER}/Ascii-Motion-Premium.git packages/premium-private; then
    echo -e "${GREEN}✅ Submodule added${NC}"
else
    echo -e "${RED}❌ Failed to add submodule. Make sure:${NC}"
    echo "   1. You've created the private repo on GitHub"
    echo "   2. You have SSH access configured (git@github.com)"
    echo "   3. The repository is private"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 5: Set up premium package structure${NC}"
echo "================================================"
echo ""

cd packages/premium-private

# Initialize with proper structure
mkdir -p src/auth src/cloud

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@ascii-motion/premium",
  "version": "0.1.45",
  "type": "module",
  "license": "PROPRIETARY",
  "description": "ASCII Motion - Premium features (authentication, cloud storage, payments)",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./auth/*": {
      "types": "./dist/auth/*/index.d.ts",
      "import": "./dist/auth/*/index.js"
    },
    "./cloud/*": {
      "types": "./dist/cloud/*/index.d.ts",
      "import": "./dist/cloud/*/index.js"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "dev": "tsc -b --watch",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "dependencies": {
    "@ascii-motion/core": "*",
    "@supabase/supabase-js": "^2.49.1"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ascii-motion/core": ["../core/src"],
      "@ascii-motion/core/*": ["../core/src/*"]
    },

    /* Output */
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" }
  ]
}
EOF

# Create README
cat > README.md << 'EOF'
# ASCII Motion - Premium Features

**⚠️ PROPRIETARY - PRIVATE REPOSITORY**

This repository contains the proprietary premium features for ASCII Motion.

## Contents

- **Authentication** - User sign up, sign in, email verification
- **Cloud Storage** - Project sync with Supabase
- **Payment Integration** - Stripe integration (future)

## License

Proprietary. Unauthorized copying, distribution, or use is prohibited.

See LICENSE for full terms.

## Development

This repo is used as a Git submodule in the main ASCII Motion repository.

```bash
# From main repo
cd packages/premium-private
npm install
npm run dev
```
EOF

# Create LICENSE
cat > LICENSE << 'EOF'
PROPRIETARY LICENSE

Copyright (c) 2025 ASCII Motion

All rights reserved.

This software and associated documentation files (the "Premium Features") are
proprietary and confidential.

Unauthorized copying, modification, distribution, or use of these Premium Features
is strictly prohibited without explicit written permission from ASCII Motion.

For licensing inquiries, contact: contact@ascii-motion.com
EOF

# Create initial source files
cat > src/index.ts << 'EOF'
/**
 * ASCII Motion - Premium Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying, distribution, or use is prohibited.
 */

// Premium package entry point
export * from './auth';
export * from './cloud';
EOF

cat > src/auth/index.ts << 'EOF'
/**
 * ASCII Motion - Premium Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying, distribution, or use is prohibited.
 */

// Authentication exports
// Add your auth components here
export {};
EOF

cat > src/cloud/index.ts << 'EOF'
/**
 * ASCII Motion - Premium Features
 * 
 * @license Proprietary
 * @copyright 2025 ASCII Motion
 * @see LICENSE for full license text
 * 
 * This file is part of ASCII Motion's premium features.
 * Unauthorized copying, distribution, or use is prohibited.
 */

// Cloud storage exports
// Add your cloud sync features here
export {};
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules

# Build outputs
dist
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.production
.env.*.local

# Editor
.DS_Store
.vscode/*
!.vscode/extensions.json
EOF

echo -e "${GREEN}✅ Premium package structure created${NC}"

echo ""
echo -e "${BLUE}Step 6: Restore backed up files${NC}"
echo "================================================"
echo ""

if [ -d "../../.backup-premium/src" ]; then
    cp -r ../../.backup-premium/src/* src/
    echo -e "${GREEN}✅ Restored premium files${NC}"
    rm -rf ../../.backup-premium
fi

echo ""
echo -e "${BLUE}Step 7: Initial commit to private repo${NC}"
echo "================================================"
echo ""

git add .
git commit -m "Initial commit: Premium package structure

- Add package.json with proprietary license
- Add TypeScript configuration
- Add source file structure (auth, cloud)
- Add LICENSE and README
"

echo -e "${GREEN}✅ Committed to private repo${NC}"

echo ""
echo -e "${BLUE}Step 8: Push to GitHub${NC}"
echo "================================================"
echo ""

git push -u origin main

echo -e "${GREEN}✅ Pushed to GitHub${NC}"

cd ../..

echo ""
echo -e "${BLUE}Step 9: Update main repo${NC}"
echo "================================================"
echo ""

# Remove old premium package from root package.json if needed
# The submodule handles this now

# Create symbolic link for easier access
if [ ! -L "packages/premium" ]; then
    ln -s premium-private packages/premium
    echo -e "${GREEN}✅ Created symbolic link: packages/premium → packages/premium-private${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "Your premium code is now:"
echo "  ✅ In a private GitHub repository"
echo "  ✅ Version controlled"
echo "  ✅ Backed up to GitHub"
echo "  ✅ Safe from data loss"
echo "  ✅ Available on all your machines"
echo ""
echo "Next steps:"
echo "  1. Verify private repo: https://github.com/${GITHUB_USER}/Ascii-Motion-Premium"
echo "  2. Commit submodule to main repo: git add .gitmodules packages/premium-private"
echo "  3. Push main repo: git push"
echo ""
echo "On another machine, clone with:"
echo "  git clone --recurse-submodules git@github.com:${GITHUB_USER}/Ascii-Motion.git"
echo ""
