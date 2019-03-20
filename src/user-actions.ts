import { VSCodeWindow } from "./vscode.interfaces";
import { InputBoxOptions, QuickPickOptions, QuickPickItem } from "vscode";

export class UserActions {
    constructor(private window: VSCodeWindow) {
    }

    async showInfo(text: string): Promise<void> {
        await this.window.showInformationMessage(text);
    }

    async showError(text: string): Promise<void> {
        await this.window.showErrorMessage(text);
    }

    async promptAsync(text: string, placeHolder: string, validator: (x: string) => any): Promise<string | undefined> {
        const options: InputBoxOptions = {
            ignoreFocusOut: true,
            placeHolder: placeHolder,
            validateInput: validator,
            prompt: text,
        };

        return await this.window.showInputBox(options);
    }

    async pickAsync(text: string, items: string[]): Promise<string | null> {
        const options: QuickPickOptions = {
            ignoreFocusOut: true,
            placeHolder: text
        };

        const quickPicks: QuickPickItem[] = [];
        for (const item of items) {
            quickPicks.push({
                label: item,
                alwaysShow: true
            });
        }

        const pick = await this.window.showQuickPick(quickPicks, options);
        return pick ? pick.label : null;
    }
}