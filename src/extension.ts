import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CodeTracker } from './codeTracker';
import { ReportGenerator } from './reportGenerator';
import { ConfigManager } from './configManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Code Tracking extension bootstrap starting');

    let configManager: ConfigManager | null = null;
    let codeTracker: CodeTracker | null = null;
    let reportGenerator: ReportGenerator | null = null;
    let statusBarItem: vscode.StatusBarItem | null = null;

    const initOnce = async (): Promise<void> => {
        if (codeTracker) return; // already initialized
        try {
            configManager = new ConfigManager();
            codeTracker = new CodeTracker(configManager);
            reportGenerator = new ReportGenerator(configManager);
            reportGenerator.setCodeTracker(codeTracker);

            // Start tracking
            codeTracker.startTracking();

            // Set up status bar item with a bound command for quick toggling
            statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            statusBarItem.text = '$(symbol-event) Tracking';
            statusBarItem.tooltip = 'Code tracking is active';
            statusBarItem.command = 'cursor-code-tracking.toggleTracking';
            statusBarItem.show();
            context.subscriptions.push(statusBarItem);

            // Update status bar periodically
            setInterval(() => {
                if (!codeTracker || !statusBarItem) return;
                const stats = codeTracker.getStats();
                statusBarItem.text = `$(code) H:${stats.humanLines} L:${stats.llmLines}`;
            }, 5000);

            // Check LLM threshold on activation
            await reportGenerator.checkLLMThreshold();

            console.log('Cursor Code Tracking extension initialized');
        } catch (error) {
            console.error('Cursor Code Tracking initialization failed:', error);
            vscode.window.showErrorMessage('Cursor Code Tracking failed to initialize. See Developer Tools console for details.');
        }
    };

    // Register commands FIRST, so they exist even if initialization fails
    const generateReportCommand = vscode.commands.registerCommand(
        'cursor-code-tracking.generateReport',
        async () => {
            await initOnce();
            if (reportGenerator) {
                await reportGenerator.generateReport();
            }
        }
    );

    const toggleTrackingCommand = vscode.commands.registerCommand(
        'cursor-code-tracking.toggleTracking',
        async () => {
            await initOnce();
            if (codeTracker) {
                codeTracker.toggleTracking();
            }
        }
    );

    const debugCommand = vscode.commands.registerCommand(
        'cursor-code-tracking.debug',
        async () => {
            await initOnce();
            if (codeTracker) {
                const stats = codeTracker.getStats();
                const lineData = codeTracker.getLineData();
                console.log('Debug - Stats:', stats);
                console.log('Debug - Files tracked:', lineData.size);
                console.log('Debug - Workspace root:', configManager?.getWorkspaceRoot());
                vscode.window.showInformationMessage(`Debug: H:${stats.humanLines} L:${stats.llmLines}, Files:${lineData.size}`);
            }
        }
    );

    context.subscriptions.push(generateReportCommand, toggleTrackingCommand, debugCommand);

    // Kick off initialization in the background
    void initOnce();
}

export function deactivate() {
    console.log('Cursor Code Tracking extension deactivated');
} 