#!/bin/bash

# Cursor Code Tracking Extension VSIX Installer
echo "🚀 Installing Cursor Code Tracking Extension via VSIX..."

# Check if VSIX file exists
if [ ! -f "cursor-code-tracking-0.1.0.vsix" ]; then
    echo "❌ Error: VSIX file not found. Please run 'npx vsce package' first."
    exit 1
fi

echo "📦 VSIX package found: cursor-code-tracking-0.1.0.vsix"
echo ""
echo "📋 Installation Instructions:"
echo "============================="
echo ""
echo "1. Open Cursor"
echo "2. Go to Extensions (Cmd+Shift+X)"
echo "3. Click '...' (More Actions) in the Extensions panel"
echo "4. Select 'Install from VSIX...'"
echo "5. Navigate to this folder and select 'cursor-code-tracking-0.1.0.vsix'"
echo "6. Click 'Install'"
echo ""
echo "✅ After installation:"
echo "- The extension will appear in your Extensions list"
echo "- You can enable/disable it from the Extensions panel"
echo "- Check the status bar for tracking indicator"
echo "- Use Command Palette (Cmd+Shift+P) to access extension commands"
echo ""
echo "🎯 Alternative: Drag and drop the VSIX file into Cursor window"
echo ""
echo "📁 VSIX file location: $(pwd)/cursor-code-tracking-0.1.0.vsix" 