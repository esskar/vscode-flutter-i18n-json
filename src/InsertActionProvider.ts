import { CodeActionProvider, CodeActionKind, Range, CodeAction, TextDocument, DocumentFilter, CodeActionContext, Diagnostic, window } from "vscode";
import { I18nConfig, I18nFunction } from "./i18n.interfaces";

export interface InsertActionProviderDelegate {
    readConfigFileAsync(): Promise<I18nConfig>;
    readI18nFileAsync(locale: string, config: I18nConfig): Promise<{ [id: string]: any }>;
    writeI18nFileAsync(locale: string, i18n: any, config: I18nConfig): Promise<void>;
    buildFunction(name: string, value: string): I18nFunction;
    generateUpdateAsync(): Promise<void>;
}

interface CommandInput {
    name: string;
    range: Range;
}

export class InsertActionProvider implements CodeActionProvider {
    readonly actionName = "flutterI18nInsert";
    readonly delegate: InsertActionProviderDelegate;
    readonly filter: DocumentFilter = { language: "dart", scheme: "file" };
    readonly regex = RegExp('^The getter \'(.*)\' isn\'t defined for the class \'I18n\'.');

    constructor(delegate: InsertActionProviderDelegate) {
        this.delegate = delegate;
    }

    extractName(context: CodeActionContext): [string, Diagnostic] | null {
        for (const obj of context.diagnostics) {
            if (obj.code === "undefined_getter") {
                const result = this.regex.exec(obj.message);
                if (result && result.length === 2) {
                    return [result[1], obj];
                }
            }
        }
        return null;
    }
    provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext): CodeAction[] {
        const result = this.extractName(context);
        if (result) {
            const action = new CodeAction("I18n: add localization string", CodeActionKind.QuickFix);
            const input: CommandInput = {
                name: result[0],
                range: range
            };

            action.command = {
                title: action.title,
                command: this.actionName,
                arguments: [
                    input
                ]
            };
            action.diagnostics = [result[1]];
            action.isPreferred = true;
            return [action];
        }
        return [];
    }

    async insertAsync(input: CommandInput): Promise<void> {
        try {
            await this.insertAsyncThrowing(input);
        } catch (error) {
            console.log(error);
            window.showErrorMessage(error.message);
        }
    }

    async addEntryToDefaultLocale(key: string, value: string): Promise<void> {
        const config = await this.delegate.readConfigFileAsync();
        const locale = config.defaultLocale || "";

        const defaultI18n = await this.delegate.readI18nFileAsync(locale, config);

        if (defaultI18n.hasOwnProperty(key)) {
            window.showInformationMessage(`Key ${key} already exists.`);
            return;
        }

        defaultI18n[key] = value;
        await this.delegate.writeI18nFileAsync(locale, defaultI18n, config);
    }

    async insertAsyncThrowing(input: CommandInput): Promise<void> {
        const key = input.name;

        const value = await window.showInputBox({
            prompt: "Please enter key for the new localization value",
            placeHolder: "Value"
        });

        if (!key || !value) {
            window.showInformationMessage(`Adding key was cancelled.`);
            return;
        }

        await this.addEntryToDefaultLocale(key, value);

        const generated = this.delegate.buildFunction(key, value);
        if (generated.variables) {
            const joined = generated.variables.join(', ');
            const methodCall = "(" + joined + ")";

            window.activeTextEditor!.edit((x) => {
                x.insert(input.range.end, methodCall);
            });
        }

        await this.delegate.generateUpdateAsync();
    }
}
