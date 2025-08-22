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

        // Check if we have a valid workspace
        const workspaceRoot = this.configManager.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace open. Please open a folder or workspace first.');
            return;
        }

        const stats = this.codeTracker.getStats();
        const lineData = this.codeTracker.getLineData();
        const reportingConfig = this.configManager.getReportingConfig();

        console.log('Generating report with stats:', stats);
        console.log('Files analyzed:', lineData.size);
        console.log('Workspace root:', workspaceRoot);

        const reportData: ReportData = {
            human_lines: stats.humanLines,
            llm_lines: stats.llmLines,
            ratio: stats.ratio,
            timestamp: new Date().toISOString(),
            files_analyzed: lineData.size
        };

        try {
            const statsDir = path.join(workspaceRoot, '.cursor', 'stats');
            console.log('Attempting to create stats directory at:', statsDir);
            
            // Ensure stats directory exists
            await fs.ensureDir(statsDir);
            console.log('Stats directory created/verified:', statsDir);

            // Verify directory was actually created
            const dirExists = await fs.pathExists(statsDir);
            console.log('Directory exists after creation:', dirExists);
            
            if (!dirExists) {
                throw new Error(`Failed to create stats directory: ${statsDir}`);
            }

            const fileName = `code_origin_report_${new Date().toISOString().split('T')[0]}`;
            console.log('Report filename:', fileName);
            console.log('Output format:', reportingConfig.output_format);
            
            if (reportingConfig.output_format === 'json') {
                console.log('Generating JSON report...');
                await this.generateJsonReport(statsDir, fileName, reportData);
                console.log('JSON report generated successfully');
            } else if (reportingConfig.output_format === 'csv') {
                console.log('Generating CSV report...');
                await this.generateCsvReport(statsDir, fileName, reportData);
                console.log('CSV report generated successfully');
            } else {
                console.error('Unknown output format:', reportingConfig.output_format);
                throw new Error(`Unknown output format: ${reportingConfig.output_format}`);
            }

            const fullPath = path.join(statsDir, `${fileName}.${reportingConfig.output_format}`);
            console.log('Checking if report file exists at:', fullPath);
            
            const fileExists = await fs.pathExists(fullPath);
            console.log('Report file exists after generation:', fileExists);
            
            if (!fileExists) {
                throw new Error(`Report file was not created: ${fullPath}`);
            }
            
            const action = fileExists ? 'updated' : 'created';
            vscode.window.showInformationMessage(`Report ${action}: ${fullPath}`);
            
            // List contents of stats directory
            const dirContents = await fs.readdir(statsDir);
            console.log('Contents of stats directory:', dirContents);
            
        } catch (error) {
            console.error('Error generating report:', error);
            vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
        }
    }

    private async generateJsonReport(statsDir: string, fileName: string, data: ReportData): Promise<void> {
        const filePath = path.join(statsDir, `${fileName}.json`);
        console.log('JSON report file path:', filePath);
        
        try {
            // Check if file exists and read existing data
            const fileExists = await fs.pathExists(filePath);
            console.log('JSON file exists before generation:', fileExists);
            
            if (fileExists) {
                console.log('Reading existing JSON file...');
                const existingData = await fs.readJson(filePath);
                console.log('Existing data type:', typeof existingData, 'isArray:', Array.isArray(existingData));
                
                // If existing data is an array, append to it
                if (Array.isArray(existingData)) {
                    console.log('Appending to existing array...');
                    existingData.push(data);
                    await fs.writeJson(filePath, existingData, { spaces: 2 });
                } else {
                    // If it's a single object, convert to array and append
                    console.log('Converting single object to array and appending...');
                    await fs.writeJson(filePath, [existingData, data], { spaces: 2 });
                }
            } else {
                // Create new file with array containing single entry
                console.log('Creating new JSON file with array...');
                await fs.writeJson(filePath, [data], { spaces: 2 });
            }
            
            // Verify file was written
            const finalFileExists = await fs.pathExists(filePath);
            console.log('JSON file exists after generation:', finalFileExists);
            
            if (finalFileExists) {
                const fileStats = await fs.stat(filePath);
                console.log('JSON file size:', fileStats.size, 'bytes');
            }
            
        } catch (error) {
            console.error('Error updating JSON report:', error);
            // Fallback to creating new file
            console.log('Fallback: Creating new JSON file...');
            await fs.writeJson(filePath, [data], { spaces: 2 });
        }
    }

    private async generateCsvReport(statsDir: string, fileName: string, data: ReportData): Promise<void> {
        const filePath = path.join(statsDir, `${fileName}.csv`);
        
        try {
            // Check if file exists and read existing data
            if (await fs.pathExists(filePath)) {
                const existingContent = await fs.readFile(filePath, 'utf8');
                const newRow = this.convertToCsvRow(data);
                
                // Append new row to existing CSV
                await fs.appendFile(filePath, '\n' + newRow);
            } else {
                // Create new file with headers and first row
                const csvContent = this.convertToCsv(data);
                await fs.writeFile(filePath, csvContent, 'utf8');
            }
        } catch (error) {
            console.error('Error updating CSV report:', error);
            // Fallback to creating new file
            const csvContent = this.convertToCsv(data);
            await fs.writeFile(filePath, csvContent, 'utf8');
        }
    }

    private convertToCsvRow(data: ReportData): string {
        return Object.values(data).join(',');
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