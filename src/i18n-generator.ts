import * as path from 'path';
import * as fs from 'fs';

import { IDisposable } from './disposable.interface';

export class I18nGenerator implements IDisposable {

    private readonly defaultPath = "lib/generated";
    private generatedPath: string;

    constructor(private workspaceFolder: string) {
        this.generatedPath = path.resolve(this.workspaceFolder, this.defaultPath);
    }

    async generateInitialize(): Promise<void> {
        await this.initialize();
    }

    dispose(): void {
        throw new Error("Method not implemented.");
    }

    private async initialize(): Promise<void> {
        await this.createFolder(this.generatedPath);
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
}