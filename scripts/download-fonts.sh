#!/bin/bash

# Script to download bundled web fonts in woff2 format
# These fonts are open source and freely available

echo "Downloading bundled web fonts..."
cd "$(dirname "$0")/../public/fonts" || exit 1

# JetBrains Mono
echo "Downloading JetBrains Mono..."
curl -L "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip" -o JetBrainsMono.zip
unzip -q JetBrainsMono.zip "fonts/webfonts/JetBrainsMono-Regular.woff2"
mv fonts/webfonts/JetBrainsMono-Regular.woff2 ./
rm -rf fonts JetBrainsMono.zip

# Fira Code
echo "Downloading Fira Code..."
curl -L "https://github.com/tonsky/FiraCode/releases/download/6.2/Fira_Code_v6.2.zip" -o FiraCode.zip
unzip -q FiraCode.zip "woff2/FiraCode-Regular.woff2"
mv woff2/FiraCode-Regular.woff2 ./
rm -rf woff2 FiraCode.zip

# Source Code Pro
echo "Downloading Source Code Pro..."
curl -L "https://github.com/adobe-fonts/source-code-pro/releases/download/2.042R-u%2F1.062R-i%2F1.026R-vf/WOFF2-source-code-pro.zip" -o SourceCodePro.zip
unzip -q SourceCodePro.zip "WOFF2/OTF/SourceCodePro-Regular.woff2"
mv WOFF2/OTF/SourceCodePro-Regular.woff2 ./
rm -rf WOFF2 SourceCodePro.zip

echo "✓ Font download complete!"
echo "Files in public/fonts/:"
ls -lh

echo ""
echo "Total size:"
du -sh .
