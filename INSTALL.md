# Installation Guide

## Quick Start

### Option 1: Development Installation (Recommended)

1. **Clone or download this extension**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile the extension**:
   ```bash
   npm run compile
   ```

4. **Install in Cursor**:
   - Open Cursor
   - Go to Extensions (Cmd+Shift+X)
   - Click "..." (More Actions)
   - Select "Install from VSIX..."
   - Navigate to this folder and select the compiled extension

### Option 2: Manual Installation

1. **Copy the extension to Cursor's extensions directory**:
   ```bash
   # On macOS
   cp -r . ~/Library/Application\ Support/Cursor/User/extensions/cursor-code-tracking
   
   # On Windows
   xcopy /E /I . "%APPDATA%\Cursor\User\extensions\cursor-code-tracking"
   
   # On Linux
   cp -r . ~/.config/Cursor/User/extensions/cursor-code-tracking
   ```

2. **Restart Cursor**

## Verification

After installation:

1. **Check Status Bar**: You should see a tracking indicator in the bottom-right status bar
2. **Test Commands**: Open Command Palette (Cmd+Shift+P) and search for "Cursor Code Tracking"
3. **Check Configuration**: The extension will automatically read your `.cursorrules` file

## Configuration

The extension uses your existing `.cursorrules` file for configuration. Make sure it contains:

```json
{
  "tracking": {
    "human_edit_triggers": ["keystroke", "backspace", "delete", "enter", "paste_from_clipboard"],
    "llm_triggers": ["copilot_accept", "cursor_autocomplete", "ai_command_run"],
    "exclusions": ["auto_formatting", "import_statements", "generated_code_blocks"]
  },
  "reporting": {
    "output_format": "json",
    "granularity": "project",
    "metrics": ["human_lines_count", "llm_lines_count", "human_llm_ratio"]
  }
}
```

## Troubleshooting

### Extension not loading
- Check the Developer Console (Help > Toggle Developer Tools)
- Look for any error messages
- Ensure all dependencies are installed

### No visual indicators
- Check if tracking is enabled (Command Palette > "Toggle Code Tracking")
- Verify your `.cursorrules` file is valid JSON
- Try editing a file to trigger tracking

### Reports not generating
- Check if `.cursor/stats/` directory exists
- Verify file permissions
- Check the Developer Console for errors

## Development

To modify the extension:

1. **Edit source files** in `src/`
2. **Recompile**: `npm run compile`
3. **Reload extension**: Command Palette > "Developer: Reload Window"

## Building VSIX Package

If you want to create a distributable package:

```bash
# Install vsce (if not already installed)
npm install -g @vscode/vsce

# Create VSIX package
vsce package

# Install the generated .vsix file in Cursor
```

## Support

For issues or questions:
1. Check the Developer Console for error messages
2. Verify your `.cursorrules` configuration
3. Test with a simple file first
4. Check the README.md for detailed documentation 