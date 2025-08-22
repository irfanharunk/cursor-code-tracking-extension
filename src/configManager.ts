import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface TrackingConfig {
    human_edit_triggers: string[];
    llm_triggers: string[];
    exclusions: string[];
}

export interface ReportingConfig {
    output_format: string;
    granularity: string;
    metrics: string[];
}

export interface CursorRules {
    tracking: TrackingConfig;
    reporting: ReportingConfig;
}

export class ConfigManager {
    private cursorRules: CursorRules | null = null;
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.loadCursorRules();
    }

    private async loadCursorRules(): Promise<void> {
        try {
            const cursorRulesPath = path.join(this.workspaceRoot, '.cursorrules');
            if (await fs.pathExists(cursorRulesPath)) {
                const content = await fs.readFile(cursorRulesPath, 'utf8');
                this.cursorRules = JSON.parse(content);
                console.log('Loaded .cursorrules configuration:', this.cursorRules);
            } else {
                console.log('No .cursorrules file found, using defaults');
                this.cursorRules = this.getDefaultConfig();
            }
        } catch (error) {
            console.error('Error loading .cursorrules:', error);
            this.cursorRules = this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): CursorRules {
        return {
            tracking: {
                human_edit_triggers: [
                    'keystroke',
                    'backspace',
                    'delete',
                    'enter',
                    'paste_from_clipboard'
                ],
                llm_triggers: [
                    'copilot_accept',
                    'cursor_autocomplete',
                    'ai_command_run'
                ],
                exclusions: [
                    'auto_formatting',
                    'import_statements',
                    'generated_code_blocks'
                ]
            },
            reporting: {
                output_format: 'json',
                granularity: 'project',
                metrics: [
                    'human_lines_count',
                    'llm_lines_count',
                    'human_llm_ratio'
                ]
            }
        };
    }

    public getTrackingConfig(): TrackingConfig {
        return this.cursorRules?.tracking || this.getDefaultConfig().tracking;
    }

    public getReportingConfig(): ReportingConfig {
        const config = this.cursorRules?.reporting || this.getDefaultConfig().reporting;
        
        // Validate output_format
        if (config.output_format !== 'json' && config.output_format !== 'csv') {
            console.warn(`Invalid output_format: ${config.output_format}, defaulting to 'json'`);
            config.output_format = 'json';
        }
        
        // Validate granularity
        if (config.granularity !== 'file' && config.granularity !== 'project') {
            console.warn(`Invalid granularity: ${config.granularity}, defaulting to 'project'`);
            config.granularity = 'project';
        }
        
        return config;
    }

    public getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }

    public async reloadConfig(): Promise<void> {
        await this.loadCursorRules();
    }
} 