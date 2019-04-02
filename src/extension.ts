import {
    commands,
    window,
    ExtensionContext
} from "vscode";

import { I18nGenerator } from "./i18n-generator";
import { FileSystem } from "./file-system";
import { UserActions } from "./user-actions";
import { WorkspaceExtensions } from "./workspace-extensions";

export function activate(context: ExtensionContext) {
    const subscriptions = context.subscriptions;

    const workspaceExtensions = new WorkspaceExtensions();
    const workspaceFolder = workspaceExtensions.getWorkspaceFolder();

    const i18nGenerator = new I18nGenerator(
        workspaceFolder, new FileSystem(), new UserActions(window));

    subscriptions.push(commands.registerCommand("flutterI18nJsonInit", () => {
        i18nGenerator.generateInitializeAsync();
    }));

    subscriptions.push(commands.registerCommand("flutterI18nJsonAdd", () => {
        i18nGenerator.generateAddAsync();
    }));

    subscriptions.push(commands.registerCommand("flutterI18nJsonUpdate", () => {
        i18nGenerator.generateUpdateAsync();
    }));

    subscriptions.push(commands.registerCommand("flutterI18nJsonRemove", () => {
        i18nGenerator.generateRemoveAsync();
    }));

    subscriptions.push(commands.registerCommand("flutterI18nGTranslateApiCodeAdd", () => {
        i18nGenerator.generateGTranslateApiCodeAdd();
    }));

    subscriptions.push(i18nGenerator);
}

export function deactivate() { }
