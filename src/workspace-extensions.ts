import {
    workspace
} from 'vscode';

export class WorkspaceExtensions {
    constructor() {

    }

    getWorkspaceFolder(): string {
        const folders = workspace.workspaceFolders;
        if (!folders) {
            return "";
        }

        const folder = folders[0] || {};
        const uri = folder.uri;
        
        return uri.fsPath;
    }
}