# Cursor Code Tracking Extension

A Cursor extension that tracks and visualizes human vs LLM code contributions with real-time indicators and automated reporting.

## Features

### Phase 1: Core Tracking ✅
- **Line Classification**: Automatically tags every line as `HUMAN` or `LLM` based on edit patterns
- **Real-Time Visuals**: 
  - Gutter icons: `🌐` (LLM) | `✏️` (HUMAN)
  - Optional background tinting for LLM lines
- **Smart Detection**: Uses heuristics to distinguish between human typing and AI completions

### Phase 2: Reporting ✅
- **Automated Reports**: Generates daily `code_origin_report.json` to `.cursor/stats/`
- **Multiple Formats**: Supports JSON and CSV output (configurable in `.cursorrules`)
- **Metrics**: Tracks human lines, LLM lines, and human/LLM ratio

### Phase 3: Workflow Integration ✅
- **Threshold Warnings**: Alerts when LLM code exceeds configurable threshold (default: 70%)
- **Status Bar**: Real-time display of tracking statistics
- **Commands**: Toggle tracking and generate reports via command palette

## Configuration

The extension reads configuration from your `.cursorrules` file:

```json
{
  "tracking": {
    "human_edit_triggers": [
      "keystroke",
      "backspace", 
      "delete",
      "enter",
      "paste_from_clipboard"
    ],
    "llm_triggers": [
      "copilot_accept",
      "cursor_autocomplete", 
      "ai_command_run"
    ],
    "exclusions": [
      "auto_formatting",
      "import_statements",
      "generated_code_blocks"
    ]
  },
  "reporting": {
    "output_format": "json|csv",
    "granularity": "file|project",
    "metrics": [
      "human_lines_count",
      "llm_lines_count", 
      "human_llm_ratio"
    ]
  }
}
```

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Compile Extension**:
   ```bash
   npm run compile
   ```

3. **Install in Cursor**:
   - Copy the extension to your Cursor extensions directory
   - Or use the VSIX package for installation

## Usage

### Commands
- `Cursor Code Tracking: Generate Code Origin Report` - Generate a new report
- `Cursor Code Tracking: Toggle Code Tracking` - Enable/disable tracking

### Status Bar
The extension shows real-time statistics in the status bar:
- `H:1200 L:800` - Human lines vs LLM lines

### Reports
Reports are automatically generated in `.cursor/stats/` with format:
```json
{
  "human_lines": 1200,
  "llm_lines": 800,
  "ratio": "60% human",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "files_analyzed": 5
}
```

## Development

### Project Structure
```
src/
├── extension.ts          # Main extension entry point
├── codeTracker.ts        # Core tracking logic
├── reportGenerator.ts    # Report generation
└── configManager.ts      # Configuration management
```

### Building
```bash
npm run compile    # Build extension
npm run watch      # Watch for changes
npm run lint       # Lint code
```

## Technical Details

### Line Classification Algorithm
The extension uses heuristics to classify code origins:

1. **LLM Detection**:
   - Large text insertions (>50 chars with newlines)
   - Multi-line completions
   - Pattern-based detection

2. **Human Detection**:
   - Small character changes (≤3 chars)
   - Single character insertions
   - Cursor movements and selections

3. **Exclusions**:
   - Auto-formatting changes
   - Import statement modifications
   - Generated code blocks

### Performance Considerations
- Minimal performance impact through efficient event handling
- Lazy decoration updates
- Configurable tracking on/off

### Limitations
- Heuristic-based classification (not 100% accurate)
- Requires manual configuration for optimal results
- Limited to text-based detection (no semantic analysis)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 