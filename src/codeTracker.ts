import * as vscode from 'vscode';
import { ConfigManager } from './configManager';

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
    private isTracking: boolean = true;
    private gutterIcons: Map<string, vscode.TextEditorDecorationType> = new Map();
    private backgroundTinting: vscode.TextEditorDecorationType | null = null;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
        this.setupDecorations();
    }

    private setupDecorations(): void {
        // Gutter icons
        const humanIcon = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.createIconPath('✏️'),
            gutterIconSize: 'contain'
        });

        const llmIcon = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this.createIconPath('🌐'),
            gutterIconSize: 'contain'
        });

        this.gutterIcons.set('HUMAN', humanIcon);
        this.gutterIcons.set('LLM', llmIcon);

        // Background tinting for LLM lines
        this.backgroundTinting = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            isWholeLine: true
        });
    }

    private createIconPath(icon: string): vscode.Uri {
        // Create a simple SVG icon
        const svg = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <text x="8" y="12" font-family="Arial" font-size="12" text-anchor="middle" fill="currentColor">${icon}</text>
        </svg>`;
        
        const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        return vscode.Uri.parse(dataUri);
    }

    public startTracking(): void {
        // Listen for text document changes
        vscode.workspace.onDidChangeTextDocument(this.handleTextChange.bind(this));
        
        // Listen for editor selection changes (to detect cursor movements)
        vscode.window.onDidChangeTextEditorSelection(this.handleSelectionChange.bind(this));
        
        // Listen for document saves
        vscode.workspace.onDidSaveTextDocument(this.handleDocumentSave.bind(this));

        console.log('Code tracking started');
    }

    private handleTextChange(event: vscode.TextDocumentChangeEvent): void {
        if (!this.isTracking) return;

        const fileUri = event.document.uri.toString();
        const trackingConfig = this.configManager.getTrackingConfig();

        event.contentChanges.forEach(change => {
            // Determine the origin based on the change
            const origin = this.determineOrigin(change, trackingConfig);
            
            if (origin) {
                this.recordLineData(fileUri, change.range.start.line, origin, 'text_change');
                this.updateVisualIndicators(event.document);
            }
        });
    }

    private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        if (!this.isTracking) return;

        // This could be used to detect cursor movements and infer human activity
        // For now, we'll use it to update visual indicators
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

    private determineOrigin(change: vscode.TextDocumentContentChangeEvent, config: any): 'HUMAN' | 'LLM' | null {
        // Simple heuristics to determine origin
        // In a real implementation, you'd want more sophisticated detection
        
        // Check if it's likely an LLM completion (large insertions, specific patterns)
        if (change.text.length > 50 && change.text.includes('\n')) {
            return 'LLM';
        }

        // Check if it's likely human input (small changes, single characters)
        if (change.text.length <= 3 && !change.text.includes('\n')) {
            return 'HUMAN';
        }

        // Default to human for ambiguous cases
        return 'HUMAN';
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
    }

    private updateVisualIndicators(document: vscode.TextDocument): void {
        const fileUri = document.uri.toString();
        const fileData = this.lineData.get(fileUri) || [];

        if (fileData.length === 0) return;

        const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === fileUri);
        if (!editor) return;

        // Group lines by origin
        const humanLines: vscode.Range[] = [];
        const llmLines: vscode.Range[] = [];

        fileData.forEach(data => {
            const range = new vscode.Range(data.lineNumber, 0, data.lineNumber, 0);
            if (data.origin === 'HUMAN') {
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
    }

    private generateFileReport(fileUri: string): void {
        const fileData = this.lineData.get(fileUri) || [];
        const stats = this.getStats();
        
        console.log(`File report for ${fileUri}:`, stats);
    }

    public getLineData(): Map<string, LineData[]> {
        return this.lineData;
    }
} 