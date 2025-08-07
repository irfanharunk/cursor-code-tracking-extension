#!/bin/bash

# Cursor Code Tracking Extension Installer
echo "🚀 Installing Cursor Code Tracking Extension..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the extension directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile the extension
echo "🔨 Compiling extension..."
npm run compile

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ Extension compiled successfully!"
    
    # Detect OS and provide installation instructions
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        CURSOR_EXTENSIONS_DIR="$HOME/Library/Application Support/Cursor/User/extensions"
        echo "🖥️  Detected macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        CURSOR_EXTENSIONS_DIR="$HOME/.config/Cursor/User/extensions"
        echo "🐧 Detected Linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        CURSOR_EXTENSIONS_DIR="$APPDATA/Cursor/User/extensions"
        echo "🪟 Detected Windows"
    else
        echo "❓ Unknown OS, please install manually"
        exit 1
    fi
    
    # Create extensions directory if it doesn't exist
    mkdir -p "$CURSOR_EXTENSIONS_DIR"
    
    # Copy extension
    EXTENSION_DIR="$CURSOR_EXTENSIONS_DIR/cursor-code-tracking"
    echo "📁 Installing to: $EXTENSION_DIR"
    
    # Remove existing installation if it exists
    if [ -d "$EXTENSION_DIR" ]; then
        echo "🗑️  Removing existing installation..."
        rm -rf "$EXTENSION_DIR"
    fi
    
    # Copy files
    cp -r . "$EXTENSION_DIR"
    
    if [ $? -eq 0 ]; then
        echo "✅ Installation completed successfully!"
        echo ""
        echo "🎉 Next steps:"
        echo "1. Restart Cursor"
        echo "2. Check the status bar for tracking indicator"
        echo "3. Open Command Palette (Cmd+Shift+P) and search for 'Cursor Code Tracking'"
        echo "4. Edit a file to see the gutter icons in action"
        echo ""
        echo "📖 For more information, see README.md and INSTALL.md"
    else
        echo "❌ Installation failed. Please try manual installation."
        echo "See INSTALL.md for manual installation instructions."
    fi
else
    echo "❌ Compilation failed. Please check the error messages above."
    exit 1
fi 