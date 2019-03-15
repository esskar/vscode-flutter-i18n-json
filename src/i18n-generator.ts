import * as path from 'path';
import * as fs from 'fs';

import { IDisposable } from './disposable.interface';
import { I18nConfig } from './i18n-config.interface';
import { InputBoxOptions } from 'vscode';
import { VSCodeWindow } from './vscode.interfaces';

export class I18nGenerator implements IDisposable {
    private static readonly defaultGeneratedPath = "lib/generated";
    private static readonly defaultI18nPath = "i18n";
    private static readonly defaultLocale = "en";
    private static readonly i18nConfigFile = "i18nconfig.json";

    private libGeneratedWorkspace: string;
    private i18nWorkspace: string;

    constructor(
        private workspaceFolder: string,
        private window: VSCodeWindow) {
        this.libGeneratedWorkspace = path.resolve(
            this.workspaceFolder, I18nGenerator.defaultGeneratedPath);
        this.i18nWorkspace = path.resolve(
            this.workspaceFolder, I18nGenerator.defaultI18nPath);
    }

    async generateInitialize(): Promise<void> {
        let defaultLocale = await this.prompt(
            "Default two-letter locale code",
            I18nGenerator.defaultLocale, this.validateLocale);
        if (!defaultLocale) {
            defaultLocale = I18nGenerator.defaultLocale;
        }

        await this.initialize();
        await this.writeConfigFile({
            defaultLocale: defaultLocale,
            localePath: I18nGenerator.defaultI18nPath,
            generatedPath: I18nGenerator.defaultGeneratedPath
        });
    }

    dispose(): void { }

    private async initialize(): Promise<void> {
        await this.createFolder(this.libGeneratedWorkspace);
        await this.createFolder(this.i18nWorkspace);
    }

    private createFolder(folder: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.exists(folder, exists => {
                if (exists) {
                    // folder already exists, finish
                    resolve();
                } else {
                    fs.mkdir(folder, async error => {
                        if (!error) {
                            // everything good, finish
                            resolve();
                        } else if (error.code === "ENOENT") {
                            // error, probably because the parent folder does not exist
                            const parent = path.dirname(folder);
                            await this.createFolder(parent);
                            await this.createFolder(folder);
                        } else {
                            // other error, give up
                            reject(error);
                        }
                    });
                }
            });
        });
    }

    private async writeConfigFile(config: I18nConfig): Promise<void> {
        const filename = path.resolve(this.workspaceFolder, I18nGenerator.i18nConfigFile);
        const json = JSON.stringify(config, null, 4);
        await this.writeFile(filename, json);
    }

    private async prompt(text: string, placeHolder: string, validator: (x: string) => any): Promise<string | undefined> {
        const options: InputBoxOptions = {
            ignoreFocusOut: true,
            placeHolder: placeHolder,
            validateInput: validator,
            prompt: text,
        };

        return await this.window.showInputBox(options);
    }

    private validateLocale(locale: string): string | null {
        if (locale) {
            if (locale.includes(' ')) {
                return "Spaces are not allowed.";
            }
            if (locale.length != 2) {
                return "Locale needs to be two letters.";
            }
        }

        // no errors
        return null;
    }

    private writeFile(filename: string, data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(filename, data, error => {
                error ? reject(error) : resolve();
            })
        });
    }
}