import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CodeTracker } from './codeTracker';
import { ReportGenerator } from './reportGenerator';
import { ConfigManager } from './configManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Cursor Code Tracking extension is now active!');

    const configManager = new ConfigManager();
    const codeTracker = new CodeTracker(configManager);
    const reportGenerator = new ReportGenerator(configManager);

    // Connect report generator with code tracker
    reportGenerator.setCodeTracker(codeTracker);

    // Register commands
    const generateReportCommand = vscode.commands.registerCommand(
        'cursor-code-tracking.generateReport',
        () => reportGenerator.generateReport()
    );

    const toggleTrackingCommand = vscode.commands.registerCommand(
        'cursor-code-tracking.toggleTracking',
        () => codeTracker.toggleTracking()
    );

    context.subscriptions.push(generateReportCommand, toggleTrackingCommand);

    // Start tracking
    codeTracker.startTracking();

    // Set up status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(code) Tracking';
    statusBarItem.tooltip = 'Code tracking is active';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar periodically
    setInterval(() => {
        const stats = codeTracker.getStats();
        statusBarItem.text = `$(code) H:${stats.humanLines} L:${stats.llmLines}`;
    }, 5000);

    // Check LLM threshold on activation
    reportGenerator.checkLLMThreshold();
}

export function deactivate() {
    console.log('Cursor Code Tracking extension deactivated');
} 