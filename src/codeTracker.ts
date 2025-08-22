import * as vscode from 'vscode';
import { ConfigManager } from './configManager';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface LineData {
    lineNumber: number;
    origin: 'HUMAN' | 'LLM';
    timestamp: number;
    trigger: string;
}

export interface TrackingStats {
    humanLines: number;
    llmLines: number;
    ratio: string;
}

export class CodeTracker {
    private configManager: ConfigManager;
    private lineData: Map<string, LineData[]> = new Map(); // fileUri -> LineData[]
    // Fast lookup for the latest known origin per file and line
    private currentLineOrigins: Map<string, Map<number, 'HUMAN' | 'LLM'>> = new Map();
    private isTracking: boolean = true;
    private gutterIcons: Map<string, vscode.TextEditorDecorationType> = new Map();
    private backgroundTinting: vscode.TextEditorDecorationType | null = null;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
        this.setupDecorations();
    }

    private setupDecorations(): void {
        try {
            const mediaDir = path.join(__dirname, '..', 'media');
            const humanSvgPath = path.join(mediaDir, 'human.svg');
            const llmSvgPath = path.join(mediaDir, 'llm.svg');

            const humanIcon = fs.pathExistsSync(humanSvgPath)
                ? vscode.window.createTextEditorDecorationType({
                    gutterIconPath: vscode.Uri.file(humanSvgPath),
                    gutterIconSize: 'contain'
                })
                : vscode.window.createTextEditorDecorationType({});

            const llmIcon = fs.pathExistsSync(llmSvgPath)
                ? vscode.window.createTextEditorDecorationType({
                    gutterIconPath: vscode.Uri.file(llmSvgPath),
                    gutterIconSize: 'contain'
                })
                : vscode.window.createTextEditorDecorationType({});

            this.gutterIcons.set('HUMAN', humanIcon);
            this.gutterIcons.set('LLM', llmIcon);
        } catch (error) {
            console.error('Failed to set up gutter icons:', error);
            this.gutterIcons.set('HUMAN', vscode.window.createTextEditorDecorationType({}));
            this.gutterIcons.set('LLM', vscode.window.createTextEditorDecorationType({}));
        }

        // Background tinting for LLM lines
        this.backgroundTinting = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            isWholeLine: true
        });
    }

    // Previously used a data URI for icons; data URIs are not supported for gutter icons.

    public startTracking(): void {
        // Listen for text document changes
        vscode.workspace.onDidChangeTextDocument(this.handleTextChange.bind(this));
        
        // Listen for editor selection changes to keep decorations fresh
        vscode.window.onDidChangeTextEditorSelection(this.handleSelectionChange.bind(this));

        // Re-apply decorations when the active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.updateVisualIndicators(editor.document);
            }
        });

        // Re-apply decorations when visible editors set changes (e.g., switching tabs, splits)
        vscode.window.onDidChangeVisibleTextEditors(editors => {
            editors.forEach(editor => this.updateVisualIndicators(editor.document));
        });
        
        // Listen for document saves
        vscode.workspace.onDidSaveTextDocument(this.handleDocumentSave.bind(this));

        console.log('Code tracking started');
    }

    private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
        if (!this.isTracking) return;

        const fileUri = event.document.uri.toString();
        const trackingConfig = this.configManager.getTrackingConfig();

        event.contentChanges.forEach(change => {
            // Ignore deletions entirely (do not flip origin)
            if (change.text === '' && change.rangeLength > 0) {
                return;
            }

            // Ignore whitespace-only edits (spaces/newlines/tabs only)
            if (this.isWhitespaceOnlyEdit(change.text)) {
                return;
            }

            // Determine the origin based on the change
            const origin = this.determineOrigin(change, trackingConfig);
            
            if (origin) {
                // Record all lines affected by this change
                this.recordMultiLineChange(fileUri, change, origin, 'text_change');
                this.updateVisualIndicators(event.document);
            }
        });
    }

    private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        // Always refresh decorations on selection changes so previously tracked marks persist
        this.updateVisualIndicators(event.textEditor.document);
    }

    private handleDocumentSave(event: vscode.TextDocument): void {
        if (!this.isTracking) return;

        // Generate report on save if configured
        const reportingConfig = this.configManager.getReportingConfig();
        if (reportingConfig.granularity === 'file') {
            this.generateFileReport(event.uri.toString());
        }
    }

    private isWhitespaceOnlyEdit(text: string): boolean {
        // Check if the text contains only whitespace characters
        // This includes spaces, tabs, newlines, carriage returns, etc.
        return text.length > 0 && /^\s*$/.test(text);
    }

    private determineOrigin(change: vscode.TextDocumentContentChangeEvent, config: any): 'HUMAN' | 'LLM' | null {
        // Enhanced heuristics to determine origin
        
        // Strong indicators of LLM completion
        if (change.text.length > 50 && change.text.includes('\n')) {
            // Large multi-line insertions are likely LLM completions
            return 'LLM';
        }
        
        if (change.text.length > 100) {
            // Very large single insertions are likely LLM
            return 'LLM';
        }

        // Check for patterns that suggest LLM completion
        if (this.hasLLMPatterns(change.text)) {
            return 'LLM';
        }

        // Human-like indicators
        if (change.text.length <= 3 && !change.text.includes('\n')) {
            // Small, single-line changes are typically human
            return 'HUMAN';
        }

        // Medium-sized insertions are ambiguous, default to human
        // This includes things like typing sentences, variable names, etc.
        return 'HUMAN';
    }

    private hasLLMPatterns(text: string): boolean {
        // Look for patterns that suggest LLM-generated content
        // This is a basic implementation - could be enhanced with more sophisticated detection
        
        // Multiple complete lines with proper indentation
        if (text.includes('\n') && text.split('\n').length > 2) {
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            if (lines.length > 2) {
                // Check if lines are properly indented and structured
                const hasConsistentIndentation = lines.every(line => 
                    line.startsWith('    ') || line.startsWith('\t') || line.trim().length === 0
                );
                if (hasConsistentIndentation) {
                    return true;
                }
            }
        }

        // Complete function/method definitions
        if (text.includes('function ') || text.includes('def ') || text.includes('=>') || 
            text.includes('class ') || text.includes('interface ') || text.includes('type ')) {
            return true;
        }

        // Complete code blocks with braces
        if (text.includes('{') && text.includes('}') && text.includes('\n')) {
            return true;
        }

        return false;
    }

    private recordLineData(fileUri: string, lineNumber: number, origin: 'HUMAN' | 'LLM', trigger: string): void {
        if (!this.lineData.has(fileUri)) {
            this.lineData.set(fileUri, []);
        }

        const fileData = this.lineData.get(fileUri)!;
        const lineData: LineData = {
            lineNumber,
            origin,
            timestamp: Date.now(),
            trigger
        };

        fileData.push(lineData);
        this.lineData.set(fileUri, fileData);

        // Update current origins map
        if (!this.currentLineOrigins.has(fileUri)) {
            this.currentLineOrigins.set(fileUri, new Map());
        }
        const originsForFile = this.currentLineOrigins.get(fileUri)!;
        originsForFile.set(lineNumber, origin);
        this.currentLineOrigins.set(fileUri, originsForFile);
    }

    private recordMultiLineChange(fileUri: string, change: vscode.TextDocumentContentChangeEvent, origin: 'HUMAN' | 'LLM', trigger: string): void {
        const startLine = change.range.start.line;
        const endLine = change.range.end.line;
        
        // Count newlines in the inserted text to determine how many new lines were added
        const newlineCount = (change.text.match(/\n/g) || []).length;
        
        if (newlineCount > 0) {
            // Multi-line insertion: mark all new lines
            for (let i = 0; i <= newlineCount; i++) {
                const lineNumber = startLine + i;
                const finalOrigin = this.decideFinalOrigin(fileUri, lineNumber, origin, change);
                this.recordLineData(fileUri, lineNumber, finalOrigin, trigger);
            }
        } else {
            // Single line change: mark only the affected line
            const finalOrigin = this.decideFinalOrigin(fileUri, startLine, origin, change);
            this.recordLineData(fileUri, startLine, finalOrigin, trigger);
        }
    }

    private updateVisualIndicators(document: vscode.TextDocument): void {
        const fileUri = document.uri.toString();
        const originsForFile = this.currentLineOrigins.get(fileUri) || new Map();
        if (originsForFile.size === 0) return;

        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === fileUri);
        if (!editor) return;

        // Group lines by origin
        const humanLines: vscode.Range[] = [];
        const llmLines: vscode.Range[] = [];

        originsForFile.forEach((lineOrigin, lineNumber) => {
            const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
            if (lineOrigin === 'HUMAN') {
                humanLines.push(range);
            } else {
                llmLines.push(range);
            }
        });

        // Apply decorations
        const humanIcon = this.gutterIcons.get('HUMAN');
        const llmIcon = this.gutterIcons.get('LLM');

        if (humanIcon) {
            editor.setDecorations(humanIcon, humanLines);
        }
        if (llmIcon) {
            editor.setDecorations(llmIcon, llmLines);
        }

        // Apply background tinting if enabled
        const config = vscode.workspace.getConfiguration('cursorCodeTracking');
        if (config.get('showBackgroundTinting') && this.backgroundTinting) {
            editor.setDecorations(this.backgroundTinting, llmLines);
        }
    }

    public getStats(): TrackingStats {
        let humanLines = 0;
        let llmLines = 0;

        this.lineData.forEach(fileData => {
            fileData.forEach(data => {
                if (data.origin === 'HUMAN') {
                    humanLines++;
                } else {
                    llmLines++;
                }
            });
        });

        const total = humanLines + llmLines;
        const ratio = total > 0 ? `${Math.round((humanLines / total) * 100)}% human` : '0% human';

        return {
            humanLines,
            llmLines,
            ratio
        };
    }

    public toggleTracking(): void {
        this.isTracking = !this.isTracking;
        const status = this.isTracking ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`Code tracking ${status}`);
        // Preserve and re-apply existing decorations even when tracking is off
        this.refreshAllVisibleEditors();
    }

    private generateFileReport(fileUri: string): void {
        const fileData = this.lineData.get(fileUri) || [];
        const stats = this.getStats();
        
        console.log(`File report for ${fileUri}:`, stats);
    }

    public getLineData(): Map<string, LineData[]> {
        return this.lineData;
    }

    private refreshAllVisibleEditors(): void {
        vscode.window.visibleTextEditors.forEach(editor => this.updateVisualIndicators(editor.document));
    }

    private decideFinalOrigin(fileUri: string, lineNumber: number, proposed: 'HUMAN' | 'LLM', change: vscode.TextDocumentContentChangeEvent): 'HUMAN' | 'LLM' {
        const existing = this.currentLineOrigins.get(fileUri)?.get(lineNumber);

        // If no existing origin, use the proposed origin
        if (!existing) {
            return proposed;
        }

        // If the line was previously marked as LLM, preserve it for small tweaks
        if (existing === 'LLM') {
            const isSmallTweak = this.isSmallTweak(change);
            if (isSmallTweak) {
                // Preserve LLM origin for small tweaks (1-3 characters)
                return 'LLM';
            }
        }

        // If the proposed origin is LLM (large insertion/completion), always use LLM
        if (proposed === 'LLM') {
            return 'LLM';
        }

        // For larger human edits on existing LLM lines, allow the change to HUMAN
        // This handles cases where significant human modifications are made to LLM code
        return proposed;
    }

    private isSmallTweak(change: vscode.TextDocumentContentChangeEvent): boolean {
        // Consider it a small tweak if:
        // 1. The text is 1-3 characters long
        // 2. It doesn't contain newlines (single-line edit)
        // 3. It's not a deletion (already handled in handleTextChange)
        return change.text.length >= 1 && 
               change.text.length <= 3 && 
               !change.text.includes('\n');
    }
} 