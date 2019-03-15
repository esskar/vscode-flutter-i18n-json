import { InputBoxOptions } from "vscode";

export interface VSCodeWindow {
    showErrorMessage(message: string): Thenable<string>;
    showInformationMessage(message: string): Thenable<string>;
    showInputBox(options?: InputBoxOptions): Thenable<string | undefined>;
}