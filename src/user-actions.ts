import { VSCodeWindow } from "./vscode.interfaces";
import { InputBoxOptions } from "vscode";

export class UserActions {
    constructor(private window: VSCodeWindow) {
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
}