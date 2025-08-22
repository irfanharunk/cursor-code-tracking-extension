# Cursor Code Tracking Extension

A Cursor/VS Code extension that tracks and visualizes human vs LLM code contributions with real-time indicators and automated reporting.

## Features

### Tracking
- Line classification: tags changed lines as HUMAN or LLM using heuristics
- Visuals:
  - Gutter icons (human vs LLM)
  - Optional background tint for LLM lines (`cursorCodeTracking.showBackgroundTinting`)
- Status bar: live counters `H:<human> L:<llm>`

### Reporting
- Generate JSON or CSV reports in `.cursor/stats/`
- Appends to the same day's report file instead of replacing it
- Threshold warning if LLM percentage exceeds `cursorCodeTracking.llmThreshold` (default 70)

### Commands
- **Cursor Code Tracking: Generate Code Origin Report** - Generate a new report
- **Cursor Code Tracking: Toggle Code Tracking** - Enable/disable tracking (existing decorations persist)
- **Cursor Code Tracking: Debug Code Tracking** - Show current stats in console

## Installation

1) Install dependencies
```bash
npm install
```

2) Compile
```bash
npm run compile
```

3) Run in Extension Development Host
- Press F5 from VS Code/Cursor to launch the dev host
- Open the Command Palette and run the commands above

4) Package (optional)
```bash
npx --yes vsce package
```
Install the generated `.vsix` and reload.

Notes for packaging:
- We rely on `.vscodeignore` (do not also use `files` in `package.json`)
- Keep runtime deps available (do not exclude needed production `node_modules`)

## Usage

- **Toggle tracking**: Use the command or click the status bar item
  - When **enabled**: Records new edits and shows decorations
  - When **disabled**: Stops recording new edits but keeps existing decorations visible
- **Make edits** in any text file to see human/LLM indicators
- **Generate reports** via the Command Palette
- **Debug**: Use "Debug Code Tracking" to see current stats, tracked files, and workspace root in the console

## Configuration

Settings (in Settings UI or `settings.json`):
- `cursorCodeTracking.enabled` (boolean)
- `cursorCodeTracking.showGutterIcons` (boolean)
- `cursorCodeTracking.showBackgroundTinting` (boolean)
- `cursorCodeTracking.reportFormat` ("json" | "csv")
- `cursorCodeTracking.llmThreshold` (number)

Workspace `.cursorrules` (optional). Example:
```json
{
  "tracking": {
    "human_edit_triggers": ["keystroke", "backspace", "delete", "enter", "paste_from_clipboard"],
    "llm_triggers": ["copilot_accept", "cursor_autocomplete", "ai_command_run"],
    "exclusions": ["auto_formatting", "import_statements", "generated_code_blocks"]
  },
  "reporting": {
    "output_format": "json",   // Allowed: "json" or "csv"
    "granularity": "project",  // Allowed: "project" or "file"
    "metrics": ["human_lines_count", "llm_lines_count", "human_llm_ratio"]
  }
}
```
Important: do not use values like `"json|csv"` or `"file|project"`. If invalid, the extension defaults to safe values and logs a warning.

## How it works

- Event-driven monitoring: listens to `onDidChangeTextDocument`, `onDidChangeTextEditorSelection`, `onDidSaveTextDocument`
- Heuristic classification:
  - LLM if the insertion is large and multi-line (>50 chars with newlines)
  - HUMAN if the change is small (≤3 chars) and single-line
  - Ambiguous cases default to HUMAN
- **Multi-line tracking**: When AI generates multiple lines, all lines in the block are marked as LLM (not just the first line)
- The extension stores a per-file list of change events and updates decorations in visible editors
- **Decorations persist**: When tracking is toggled off, existing indicators remain visible across editor switches

## Reports

- Location: `.cursor/stats/`
- Filename: `code_origin_report_YYYY-MM-DD.json` or `.csv`
- Behavior:
  - JSON: creates an array on first write; appends new entries on subsequent writes the same day
  - CSV: creates headers + first row, then appends rows on subsequent writes the same day
- Contents include: human_lines, llm_lines, ratio, timestamp, files_analyzed

## Troubleshooting

- Command not found
  - Ensure extension built and loaded (F5 or installed VSIX)
  - Reload window, then try the commands again

- Report not created
  - Open a folder/workspace (not an empty window)
  - Make some edits first (only changes are tracked)
  - Run "Debug Code Tracking" and check console logs
  - Verify permissions to write `.cursor/stats` in the workspace

- "Unknown output format"
  - Fix `.cursorrules` → use `"json"` or `"csv"` only; not `"json|csv"`

## Development

Project structure
```
src/
├── extension.ts          # Activation, command registration, lazy init
├── codeTracker.ts        # Event listeners, heuristics, decorations
├── reportGenerator.ts    # Report generation and append behavior
└── configManager.ts      # Config loading, validation, workspace root
```

Build scripts
```bash
npm run compile
npm run watch
npm run lint
```

## Changelog

### 0.2.0
- Commands registered before initialization; safer activation
- Added "Debug Code Tracking" command
- Reports append to the same day's file (JSON/CSV)
- Config validation with safe defaults for invalid values
- Packaging fixes and icon handling
- **Decorations persist when tracking is toggled off**: Existing human/LLM indicators remain visible even when tracking is disabled
- **Multi-line AI generation tracking**: All lines in AI-generated blocks are now properly marked as LLM (not just the first line)

## License

MIT License – see `LICENSE`. 