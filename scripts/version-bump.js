#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VERSION_FILE = path.join(__dirname, '../src/constants/version.ts');
const PACKAGE_FILE = path.join(__dirname, '../package.json');

// Get command line arguments
const bumpType = process.argv[2] || 'patch';

// Validate bump type
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ Invalid bump type. Use: patch, minor, or major');
  process.exit(1);
}

// Helper functions
function getCurrentGitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️  Could not get git hash:', error.message);
    return 'unknown';
  }
}

function getCommitsSinceLastVersion(lastVersionTag) {
  try {
    let command;
    if (lastVersionTag) {
      command = `git log ${lastVersionTag}..HEAD --oneline --pretty=format:"%s"`;
    } else {
      // If no previous version tag, get last 10 commits
      command = 'git log -10 --oneline --pretty=format:"%s"';
    }
    
    const commits = execSync(command, { encoding: 'utf8' })
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());
    
    return commits.length > 0 ? commits : ['Initial version'];
  } catch (error) {
    console.warn('⚠️  Could not get commit history:', error.message);
    return ['Version update'];
  }
}

function parseVersion(versionString) {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function incrementVersion(version, type) {
  const newVersion = { ...version };
  
  switch (type) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
  }
  
  return newVersion;
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function readCurrentVersion() {
  try {
    const content = fs.readFileSync(VERSION_FILE, 'utf8');
    const match = content.match(/export const VERSION = "([^"]+)"/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    console.log('📝 No existing version file found, starting at 0.1.0');
  }
  return '0.1.0';
}

function readVersionHistory() {
  try {
    const content = fs.readFileSync(VERSION_FILE, 'utf8');
    const match = content.match(/export const VERSION_HISTORY = (\[[\s\S]*?\]);/);
    if (match) {
      // Parse the JavaScript array safely using JSON
      return JSON.parse(match[1]);
    }
  } catch (error) {
    console.log('📝 No existing version history found, creating new');
  }
  return [];
}

function updatePackageJson(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(PACKAGE_FILE, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('✅ Updated package.json version');
  } catch (error) {
    console.warn('⚠️  Could not update package.json:', error.message);
  }
}

function generateVersionFile(newVersion, buildDate, buildHash, versionHistory) {
  const content = `// Auto-generated version file - DO NOT EDIT MANUALLY
// This file is updated by scripts/version-bump.js during deployment

export const VERSION = "${newVersion}";
export const BUILD_DATE = "${buildDate}";
export const BUILD_HASH = "${buildHash}";

// Version history with commit messages
export const VERSION_HISTORY = ${JSON.stringify(versionHistory, null, 2)};`;

  fs.writeFileSync(VERSION_FILE, content);
  console.log('✅ Generated new version.ts file');
}

function createGitTag(version) {
  try {
    execSync(`git tag v${version}`, { stdio: 'inherit' });
    console.log(`✅ Created git tag v${version}`);
  } catch (error) {
    console.warn('⚠️  Could not create git tag:', error.message);
  }
}

// Main execution
function main() {
  console.log(`🚀 Bumping version (${bumpType})...\n`);
  
  // Read current state
  const currentVersionString = readCurrentVersion();
  const currentVersion = parseVersion(currentVersionString);
  const versionHistory = readVersionHistory();
  
  console.log(`📋 Current version: v${currentVersionString}`);
  
  // Calculate new version
  const newVersion = incrementVersion(currentVersion, bumpType);
  const newVersionString = formatVersion(newVersion);
  
  console.log(`📈 New version: v${newVersionString}`);
  
  // Get build metadata
  const buildDate = new Date().toISOString();
  const buildHash = getCurrentGitHash();
  
  // Get commit history since last version
  const lastVersionTag = versionHistory.length > 0 ? `v${versionHistory[0].version}` : null;
  const newCommits = getCommitsSinceLastVersion(lastVersionTag);
  
  console.log(`📝 Found ${newCommits.length} new commits:`);
  newCommits.forEach(commit => console.log(`   • ${commit}`));
  
  // Update version history
  const newVersionEntry = {
    version: newVersionString,
    date: buildDate,
    commits: newCommits
  };
  
  const updatedHistory = [newVersionEntry, ...versionHistory];
  
  // Generate files
  generateVersionFile(newVersionString, buildDate, buildHash, updatedHistory);
  updatePackageJson(newVersionString);
  
  // Create git tag
  createGitTag(newVersionString);
  
  console.log(`\n🎉 Version bumped to v${newVersionString}`);
  console.log(`📅 Build date: ${new Date(buildDate).toLocaleString()}`);
  console.log(`🔗 Build hash: ${buildHash}`);
  
  return newVersionString;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error('❌ Version bump failed:', error.message);
    process.exit(1);
  }
}

export { main };