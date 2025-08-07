import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { CodeTracker } from './codeTracker';

export interface ReportData {
    human_lines: number;
    llm_lines: number;
    ratio: string;
    timestamp: string;
    files_analyzed: number;
}

export class ReportGenerator {
    private configManager: ConfigManager;
    private codeTracker: CodeTracker | null = null;

    constructor(configManager: ConfigManager) {
        this.configManager = configManager;
    }

    public setCodeTracker(codeTracker: CodeTracker): void {
        this.codeTracker = codeTracker;
    }

    public async generateReport(): Promise<void> {
        if (!this.codeTracker) {
            vscode.window.showErrorMessage('Code tracker not available');
            return;
        }

        const stats = this.codeTracker.getStats();
        const lineData = this.codeTracker.getLineData();
        const reportingConfig = this.configManager.getReportingConfig();

        const reportData: ReportData = {
            human_lines: stats.humanLines,
            llm_lines: stats.llmLines,
            ratio: stats.ratio,
            timestamp: new Date().toISOString(),
            files_analyzed: lineData.size
        };

        try {
            const workspaceRoot = this.configManager.getWorkspaceRoot();
            const statsDir = path.join(workspaceRoot, '.cursor', 'stats');
            
            // Ensure stats directory exists
            await fs.ensureDir(statsDir);

            const fileName = `code_origin_report_${new Date().toISOString().split('T')[0]}`;
            
            if (reportingConfig.output_format === 'json') {
                await this.generateJsonReport(statsDir, fileName, reportData);
            } else if (reportingConfig.output_format === 'csv') {
                await this.generateCsvReport(statsDir, fileName, reportData);
            }

            vscode.window.showInformationMessage(`Report generated: ${fileName}`);
        } catch (error) {
            console.error('Error generating report:', error);
            vscode.window.showErrorMessage('Failed to generate report');
        }
    }

    private async generateJsonReport(statsDir: string, fileName: string, data: ReportData): Promise<void> {
        const filePath = path.join(statsDir, `${fileName}.json`);
        await fs.writeJson(filePath, data, { spaces: 2 });
    }

    private async generateCsvReport(statsDir: string, fileName: string, data: ReportData): Promise<void> {
        const filePath = path.join(statsDir, `${fileName}.csv`);
        const csvContent = this.convertToCsv(data);
        await fs.writeFile(filePath, csvContent, 'utf8');
    }

    private convertToCsv(data: ReportData): string {
        const headers = Object.keys(data);
        const values = Object.values(data);
        
        return [
            headers.join(','),
            values.join(',')
        ].join('\n');
    }

    public async generateDailyReport(): Promise<void> {
        // This would be called by a scheduled task or on workspace activation
        const today = new Date().toISOString().split('T')[0];
        const workspaceRoot = this.configManager.getWorkspaceRoot();
        const statsDir = path.join(workspaceRoot, '.cursor', 'stats');
        const reportPath = path.join(statsDir, `code_origin_report_${today}.json`);

        // Check if today's report already exists
        if (await fs.pathExists(reportPath)) {
            console.log('Daily report already exists for today');
            return;
        }

        await this.generateReport();
    }

    public async checkLLMThreshold(): Promise<void> {
        if (!this.codeTracker) return;

        const stats = this.codeTracker.getStats();
        const config = vscode.workspace.getConfiguration('cursorCodeTracking');
        const threshold = config.get('llmThreshold', 70);

        const total = stats.humanLines + stats.llmLines;
        const llmPercentage = total > 0 ? (stats.llmLines / total) * 100 : 0;

        if (llmPercentage > threshold) {
            vscode.window.showWarningMessage(
                `Warning: ${llmPercentage.toFixed(1)}% of code is LLM-generated (threshold: ${threshold}%)`
            );
        }
    }
} 