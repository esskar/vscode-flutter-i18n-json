import * as vscode from "vscode";

import { I18nGenerator } from "./i18n-generator";
import { WorkspaceExtensions } from "./workspace-extensions";

export function activate(context: vscode.ExtensionContext) {
    const commands = vscode.commands;
    const subscriptions = context.subscriptions;

    const workspaceExtensions = new WorkspaceExtensions();
    const workspaceFolder = workspaceExtensions.getWorkspaceFolder();

    const i18nGenerator = new I18nGenerator(workspaceFolder);

	subscriptions.push(commands.registerCommand("extension.flutterI18nJsonInit", () => {
        i18nGenerator.generateInitialize();
    }));
    
    subscriptions.push(i18nGenerator);
}

export function deactivate() {}
