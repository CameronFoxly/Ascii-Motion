# Git Submodule Setup for Premium Package

**Strategy:** Private GitHub repository for premium code using Git submodules

---

## 🎯 Why This Approach?

### **✅ Advantages:**
1. **Version Control** - Full Git history for premium code
2. **Multi-Machine** - Work from any computer
3. **Backup** - Code is safely on GitHub
4. **Collaboration** - Can invite collaborators to private repo
5. **Clean Separation** - Public core, private premium
6. **Simple Workflow** - One clone, everything works

### **❌ What You Avoid:**
- ❌ Data loss from single machine failure
- ❌ Manual backup processes
- ❌ Gitignore complexity
- ❌ Accidentally committing premium code
- ❌ No version history for premium features

---

## 🏗️ Repository Structure

### **Two GitHub Repositories:**

**Public Repo:**
```
github.com/cameronfoxly/Ascii-Motion
├── packages/
│   ├── core/              ✅ Public (MIT License)
│   └── premium/           → Submodule pointer to private repo
├── src/                   Main application
├── docs/                  Documentation
└── .gitmodules            Submodule configuration
```

**Private Repo:**
```
github.com/cameronfoxly/Ascii-Motion-Premium (PRIVATE)
└── src/
    ├── auth/              🔒 Authentication features
    │   ├── AuthContext.tsx
    │   ├── SignUpDialog.tsx
    │   └── lib/supabase.ts
    └── cloud/             🔒 Cloud storage features
        └── useProjectSync.ts
```

### **Local Working Directory:**
```
~/GitHubRepos/Ascii-Motion/
├── packages/
│   ├── core/              From public repo
│   └── premium/           From private repo (submodule)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── auth/
│           └── cloud/
```

---

## 🚀 Quick Setup (Automated)

### **Run the Setup Script:**

```bash
./scripts/setup-premium-submodule.sh
```

This will:
1. Prompt you to create the private GitHub repo
2. Backup existing premium files
3. Add the private repo as a submodule
4. Set up proper structure
5. Restore your files
6. Make initial commit
7. Push to GitHub

---

## 📝 Manual Setup (Alternative)

### **Step 1: Create Private GitHub Repository**

1. Go to https://github.com/new
2. Repository name: `Ascii-Motion-Premium`
3. Description: `Proprietary authentication and cloud features for ASCII Motion`
4. **Visibility: PRIVATE** ⚠️ (very important!)
5. Don't initialize with README, .gitignore, or license
6. Click "Create repository"

### **Step 2: Backup Current Premium Files**

```bash
cd ~/GitHubRepos/Ascii-Motion

# Backup existing files (if any)
cp -r packages/premium .backup-premium
```

### **Step 3: Remove Current Premium Directory**

```bash
rm -rf packages/premium
```

### **Step 4: Add Private Repo as Submodule**

```bash
# Add submodule (replace YOUR_USERNAME)
git submodule add git@github.com:YOUR_USERNAME/Ascii-Motion-Premium.git packages/premium

# This creates:
# - packages/premium/ directory (linked to private repo)
# - .gitmodules file (submodule configuration)
```

### **Step 5: Set Up Premium Package**

```bash
cd packages/premium

# Create package.json (copy from .backup-premium or create new)
cp ../../.backup-premium/package.json .

# Create tsconfig.json
cp ../../.backup-premium/tsconfig.json .

# Create source structure
mkdir -p src/auth src/cloud

# Restore backed up files
cp -r ../../.backup-premium/src/* src/

# Create README
cat > README.md << 'EOF'
# ASCII Motion - Premium Features

**⚠️ PROPRIETARY - PRIVATE REPOSITORY**

This repository contains proprietary premium features.

## License
Proprietary. See LICENSE for details.
EOF

# Create LICENSE
cat > LICENSE << 'EOF'
PROPRIETARY LICENSE
Copyright (c) 2025 ASCII Motion
All rights reserved.
EOF
```

### **Step 6: Commit to Private Repo**

```bash
# Still in packages/premium/
git add .
git commit -m "Initial commit: Premium package structure"
git push -u origin main
```

### **Step 7: Commit Submodule to Main Repo**

```bash
cd ../..  # Back to main repo root

# Add submodule configuration
git add .gitmodules packages/premium
git commit -m "Add premium package as private submodule"
git push
```

---

## 💻 Daily Workflow

### **Working on Premium Features:**

```bash
# Navigate to premium package
cd packages/premium

# Create new feature
git checkout -b feature/auth-context

# Make changes to src/auth/AuthContext.tsx
# ... edit files ...

# Commit to premium repo
git add .
git commit -m "feat(auth): Add AuthContext with Supabase"
git push origin feature/auth-context

# Go back to main repo
cd ../..

# Main repo sees premium commit
git status
# Shows: modified: packages/premium (new commits)

# Commit submodule pointer update
git add packages/premium
git commit -m "Update premium package (add AuthContext)"
git push
```

### **Pulling Latest Changes:**

```bash
# Update main repo
git pull

# Update submodules
git submodule update --remote

# Or do both at once
git pull --recurse-submodules
```

---

## 🔄 Multi-Machine Setup

### **On Your First Machine (Already Done):**

```bash
# You've already set this up with the script
cd ~/GitHubRepos/Ascii-Motion
# Everything is working
```

### **On Your Second Machine (New Setup):**

```bash
# Clone with submodules in one command
git clone --recurse-submodules git@github.com:cameronfoxly/Ascii-Motion.git

cd Ascii-Motion

# Verify premium package is there
ls packages/premium/src/auth/
# Should show your premium files

# Install dependencies
npm install

# Ready to work!
npm run dev
```

### **If You Forgot `--recurse-submodules`:**

```bash
# Clone normally
git clone git@github.com:cameronfoxly/Ascii-Motion.git
cd Ascii-Motion

# Initialize submodules
git submodule init
git submodule update

# Or combined
git submodule update --init --recursive
```

---

## 🔐 Security & Access

### **Access Control:**

**Public Repo (`Ascii-Motion`):**
- ✅ Anyone can view core package
- ✅ Anyone can see submodule exists
- ❌ Cannot see premium code
- ❌ Cannot access private repo

**Private Repo (`Ascii-Motion-Premium`):**
- ✅ Only you can access (owner)
- ✅ Can invite collaborators (Settings → Collaborators)
- ❌ Not visible to public
- ❌ Not searchable on GitHub

### **What Public Sees:**

When someone views your public repo:
```
packages/
├── core/                    ✅ Full source visible
└── premium @ abc123def      ⚠️ Shows it's a submodule
                                Shows commit hash
                                Link says "Permission denied"
```

They see:
- Premium package exists
- It's at a specific commit
- Link to private repo (but can't access)

They DON'T see:
- Any premium source code
- File contents
- Implementation details

---

## 🛠️ Common Operations

### **Update Premium Package:**

```bash
cd packages/premium

# Pull latest from private repo
git pull origin main

# Back to main repo
cd ../..

# Commit updated submodule pointer
git add packages/premium
git commit -m "Update premium package to latest"
git push
```

### **Switch Premium Branch:**

```bash
cd packages/premium

# Switch to different branch
git checkout feature/cloud-sync

# Main repo notices
cd ../..
git status
# Shows: modified: packages/premium

# Commit the branch switch
git add packages/premium
git commit -m "Use premium feature/cloud-sync branch"
```

### **Check Submodule Status:**

```bash
# From main repo root
git submodule status
# Shows: commit hash and path

# Detailed info
git submodule
```

### **Remove Submodule (if needed):**

```bash
# Remove from Git
git submodule deinit packages/premium
git rm packages/premium
rm -rf .git/modules/packages/premium

# Commit removal
git commit -m "Remove premium submodule"
```

---

## ⚠️ Troubleshooting

### **"Permission denied" when cloning:**

**Problem:** SSH key not configured

**Solution:**
```bash
# Check SSH key
ssh -T git@github.com

# If fails, add SSH key:
# 1. Generate: ssh-keygen -t ed25519 -C "your_email@example.com"
# 2. Copy: cat ~/.ssh/id_ed25519.pub
# 3. Add to GitHub: Settings → SSH Keys → New SSH key
```

### **Submodule shows as "modified":**

**Problem:** You're on different commit in submodule

**Solution:**
```bash
cd packages/premium
git status
# See what branch you're on

# Option 1: Update to match main repo's expectation
git checkout main
git pull

# Option 2: Commit your change
cd ../..
git add packages/premium
git commit -m "Update premium submodule pointer"
```

### **"fatal: No url found for submodule":**

**Problem:** .gitmodules not committed

**Solution:**
```bash
git add .gitmodules
git commit -m "Add gitmodules configuration"
git push
```

### **Can't push to private repo:**

**Problem:** Not authenticated or no write access

**Solution:**
```bash
# Check remote
cd packages/premium
git remote -v

# Should show:
# origin  git@github.com:YOUR_USERNAME/Ascii-Motion-Premium.git

# Test access
git push origin main

# If fails, check GitHub permissions
```

---

## 📊 Comparison: Gitignore vs Submodule

| Feature | Gitignore Approach | Submodule Approach |
|---------|-------------------|-------------------|
| **Version Control** | ❌ No history | ✅ Full Git history |
| **Multi-Machine** | ❌ Manual copy | ✅ Git clone |
| **Backup** | ❌ Local only | ✅ GitHub backup |
| **Collaboration** | ❌ Hard to share | ✅ Easy invites |
| **Workflow** | ✅ Simple | ⚠️ Slightly complex |
| **Setup** | ✅ Easy | ⚠️ Requires setup |
| **Accident Risk** | ⚠️ Can commit by mistake | ✅ Separate repos |

---

## ✅ Benefits for Your Use Case

### **Work from Multiple Machines:**
```bash
# MacBook
git clone --recurse-submodules ...
# Work, commit, push

# iMac
git clone --recurse-submodules ...
# Continue where you left off
```

### **No Data Loss:**
```bash
# Even if laptop dies
# Premium code is safe on GitHub
# Just clone on new machine
```

### **Future Collaboration:**
```bash
# When you hire a developer
# GitHub → Settings → Collaborators
# Add them to private repo
# They can clone and contribute
```

### **Professional Setup:**
```bash
# Clean separation
# Industry standard approach
# Used by companies like:
# - Vercel (Next.js)
# - Supabase
# - Many startups with dual-license models
```

---

## 🚀 Ready to Set Up?

Run this command:
```bash
./scripts/setup-premium-submodule.sh
```

Or follow the manual steps above if you prefer more control.

---

## 📞 Next Steps After Setup

1. **Verify private repo exists** on GitHub
2. **Commit submodule to public repo**
3. **Test cloning on another machine** (if available)
4. **Start building premium features** with confidence
5. **Push regularly** to keep backup fresh

---

**Result:** You can work from any machine, with full version control, automatic backups, and no risk of data loss! ✅
