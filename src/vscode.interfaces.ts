import { InputBoxOptions, QuickPickItem, QuickPickOptions } from "vscode";

export interface VSCodeWindow {
    showErrorMessage(message: string): Thenable<string>;
    showInformationMessage(message: string): Thenable<string>;
    showInputBox(options?: InputBoxOptions): Thenable<string | undefined>;
    showQuickPick<T extends QuickPickItem>(items: T[], options?: QuickPickOptions): Thenable<T>;
}