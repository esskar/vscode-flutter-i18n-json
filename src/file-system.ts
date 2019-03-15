import * as path from 'path';
import * as fs from 'fs';

export class FileSystem {
    existsFolderAsync(folder: string): Promise<boolean> {
        return new Promise((resolve) => {
            fs.exists(folder, exists => {
                resolve(exists);
            })
        });
    }

    createFolderAsync(folder: string): Promise<void> {
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
                            await this.createFolderAsync(parent);
                            await this.createFolderAsync(folder);
                        } else {
                            // other error, give up
                            reject(error);
                        }
                    });
                }
            });
        });
    }

    combinePath(...pathSegments: string[]): string {
        return path.resolve(...pathSegments);
    }

    async readJsonFileAsync<T>(filename: string): Promise<T> {
        const json = await this.readFileAsync(filename);
        return JSON.parse(json) as T;
    }

    readFileAsync(filename: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (error, data) => {
                error ? reject(error) : resolve(data.toString());
            });
        });
    }

    writeJsonFileAsync(filename: string, data: any): Promise<void> {
        const json = JSON.stringify(data, null, 4);
        return this.writeFileAsync(filename, json);
    }

    writeFileAsync(filename: string, data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(filename, data, error => {
                error ? reject(error) : resolve();
            })
        });
    }
}