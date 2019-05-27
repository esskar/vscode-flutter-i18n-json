let LocaleCode = require('locale-code');
let RtlDetect = require('rtl-detect');

import { IDisposable } from "./disposable.interface";
import { I18nConfig, I18nFunction } from "./i18n.interfaces";
import { FileSystem } from "./file-system";
import { Hello } from "./hello";
import { UserActions } from "./user-actions";

export class I18nGenerator implements IDisposable {
    private static readonly defaultGeneratedPath = "lib/generated";
    private static readonly allowManualTranslation = false;
    private static readonly defaultI18nPath = "i18n";
    private static readonly defaultLocale = "en-US";
    private static readonly i18nConfigFile = "i18nconfig.json";

    private readonly hello = new Hello();
    private libGeneratedWorkspace: string;
    private i18nWorkspace: string;

    constructor(
        private workspaceFolder: string,
        private fs: FileSystem,
        private ua: UserActions) {
        this.libGeneratedWorkspace = this.fs.combinePath(
            this.workspaceFolder, I18nGenerator.defaultGeneratedPath);
        this.i18nWorkspace = this.fs.combinePath(
            this.workspaceFolder, I18nGenerator.defaultI18nPath);
    }

    async generateInitializeAsync(): Promise<void> {
        let defaultLocale = await this.ua.promptAsync(
            "Enter default locale code",
            I18nGenerator.defaultLocale, this.validateLocale);
        if (!defaultLocale) {
            defaultLocale = I18nGenerator.defaultLocale;
        }

        const config = <I18nConfig>{
            defaultLocale: defaultLocale,
            locales: [defaultLocale],
            localePath: I18nGenerator.defaultI18nPath,
            generatedPath: I18nGenerator.defaultGeneratedPath,
            manualTranslation: I18nGenerator.allowManualTranslation
        };

        this.updateRtl(config, defaultLocale);

        await this.initializeAsync();
        await this.writeConfigFileAsync(config);
        await this.writeI18nFileAsync(defaultLocale, {
            greetTo: this.hello.get(LocaleCode.getCountryCode(defaultLocale))
        });
        await this.generateDartFileAsync(config);

        await this.ua.showInfo(`Successfully initialized localization with default locale '${defaultLocale}'.`);

    }

    async generateAddAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();
        let locale = await this.ua.promptAsync(
            "Add new locale code",
            I18nGenerator.defaultLocale, this.validateLocaleNotEmpty);
        if (!locale) {
            return;
        }
        if (config.locales.includes(locale)) {
            return;
        }
        config.locales.push(locale);

        this.updateRtl(config, locale);

        await this.writeConfigFileAsync(config);
        await this.writeI18nFileAsync(locale, {});
        await this.generateDartFileAsync(config);

        await this.ua.showInfo(`Successfully added locale '${locale}'.`);
    }

    async generateRemoveAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();
        let pickedLocale = await this.ua.pickAsync("Remove existing locale code", config.locales);
        if (!pickedLocale) {
            return;
        }

        if (config.defaultLocale === pickedLocale) {
            await this.ua.showError(`Cannot remove the default locale '${pickedLocale}'.`);
            return;
        }

        const index = config.locales.indexOf(pickedLocale);
        if (index < 0) {
            await this.ua.showError(`Cannot find locale '${pickedLocale}'.`);
            return;
        }

        config.locales.splice(index, 1);

        this.removeRtl(config, pickedLocale);

        await this.writeConfigFileAsync(config);
        await this.removeI18nFileAsync(pickedLocale);
        await this.generateDartFileAsync(config);

        await this.ua.showInfo(`Successfully removed locale '${pickedLocale}'.`);
    }

    async generateUpdateAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();
        await this.generateDartFileAsync(config);

        await this.ua.showInfo(`Successfully updated localization.`);

    }

    dispose(): void { }

    private async initializeAsync(): Promise<void> {
        await this.fs.createFolderAsync(this.libGeneratedWorkspace);
        await this.fs.createFolderAsync(this.i18nWorkspace);
    }

    private async generateDartFileAsync(config: I18nConfig): Promise<void> {
        let dartContent = "";

        const defaultI18n = await this.readI18nFileAsync(config.defaultLocale || "");
        const functions = this.buildFunctionTable(defaultI18n);

        dartContent += this.generateFunctions(I18nGenerator.dart, "", false, undefined, functions);

        for (const locale of config.locales) {
            const isLtr = !!(config.ltr && config.ltr.includes(locale));
            let isRtl = !!(config.rtl && config.rtl.includes(locale));
            if (!isRtl && !isLtr) {
                isRtl = RtlDetect.isRtlLang(locale);
            }

            if (locale === config.defaultLocale) {
                dartContent += this.generateFunctions(
                    I18nGenerator.dartLocale, locale, isRtl);
            } else {
                try {
                    const i18n = await this.readI18nFileAsync(locale);
                    const diff = this.diffFunctionTable(functions, i18n);
                    dartContent += this.generateFunctions(
                        I18nGenerator.dartLocale, locale, isRtl, config.locales, diff, true);
                } catch (e) {
                    console.error(`Failed to generate ${locale}: ${e}`);
                }
            }
        }

        dartContent += this.generateLocales(I18nGenerator.dartGeneratedLocalizationsDelegate, config);

        const filename = this.fs.combinePath(this.libGeneratedWorkspace, "i18n.dart");
        await this.fs.writeFileAsync(filename, dartContent);
    }

    private generateFunctions(template: string, locale: string, isRtl: boolean, allLocales?: string[], functions?: I18nFunction[], overwrite?: boolean): string {
        let functionsContent = "";
        if (overwrite) {
            functionsContent += "\n";
        }
        if (!allLocales) {
            allLocales = [];
        }

        let derived = "";
        if (functions) {
            const languageCode = LocaleCode.getLanguageCode(locale);
            let pos = allLocales.indexOf(locale);
            while (pos-- > 0) {
                if (languageCode !== LocaleCode.getLanguageCode(allLocales[pos])) {
                    continue;
                }
                derived = "_I18n_" + this.normalizeLocale(allLocales[pos]);
            }
            for (const func of functions) {
                if (functionsContent.length > 0) {
                    functionsContent += "\n  ";
                }
                if (overwrite) {
                    functionsContent += "@override\n";
                    functionsContent += "  ";
                }
                functionsContent += `${func.signature} => ${func.body};`;
            }
        }

        if (!derived) {
            derived = "I18n";
        }

        const textDirection = isRtl ? "rtl" : "ltr";

        let result = template.replace(/{functions}/g, functionsContent);
        result = result.replace(/{locale}/g, this.normalizeLocale(locale));
        result = result.replace(/{derived}/g, derived);
        result = result.replace(/{textDirection}/g, textDirection);
        return result;
    }

    private generateLocales(template: string, config: I18nConfig): string {
        let localesContent = "";
        let casesContent = "";

        const languageCodes: any = {};
        for (let locale of config.locales) {
            const languageCode = LocaleCode.getLanguageCode(locale);
            const countryCode = LocaleCode.getCountryCode(locale);
            if (localesContent.length > 0) {
                localesContent += ",\n      ";
            }
            localesContent += `const Locale("${languageCode}", "${countryCode}")`;

            const normalized = this.normalizeLocale(locale);
            if (!languageCodes[languageCode]) {
                languageCodes[languageCode] = normalized;
            }
            if (casesContent.length > 0) {
                casesContent += "    else ";
            }
            casesContent += `if ("${normalized}" == lang) {\n`;
            casesContent += `      return new SynchronousFuture<WidgetsLocalizations>(const _I18n_${normalized}());\n`;
            casesContent += "    }\n";
        }

        for (let languageCode in languageCodes) {
            if (languageCodes.hasOwnProperty(languageCode)) {
                const normalized = languageCodes[languageCode];
                casesContent += `    else if ("${languageCode}" == languageCode) {\n`;
                casesContent += `      return new SynchronousFuture<WidgetsLocalizations>(const _I18n_${normalized}());\n`;
                casesContent += "    }\n";
            }
        }

        let result = template.replace("{locales}", localesContent);
        result = result.replace("{cases}", casesContent);
        result = result.replace('{shouldReloadBool}', config.manualTranslation.toString());
        return result;
    }

    private diffFunctionTable(functions: I18nFunction[], i18n: any): I18nFunction[] {
        const diffFunctions: I18nFunction[] = [];

        for (const func of functions) {
            const name = func.name;
            if (i18n.hasOwnProperty(name)) {
                const value = i18n[name];
                const variables = func.variables;
                if (variables && variables.length > 0) {
                    const body = this.replaceVariables(value, variables);
                    diffFunctions.push({
                        name: name,
                        signature: func.signature,
                        body: `"${body}"`,
                        variables: variables
                    });
                } else {
                    diffFunctions.push({
                        name: name,
                        signature: func.signature,
                        body: `"${value}"`,
                        variables: null
                    });
                }
            }
        }

        return diffFunctions;
    }

    private buildFunctionTable(i18n: any): I18nFunction[] {
        const functions: I18nFunction[] = [];
        for (const name in i18n) {
            if (i18n.hasOwnProperty(name)) {
                const value = i18n[name];
                const variables = this.parseVariables(value);
                if (variables && variables.length > 0) {
                    const body = this.replaceVariables(value, variables);
                    const parameters = this.getParameters(variables);
                    functions.push({
                        name: name,
                        signature: `String ${name}(${parameters})`,
                        body: `"${body}"`,
                        variables: variables
                    });
                } else {
                    functions.push({
                        name: name,
                        signature: `String get ${name}`,
                        body: `"${value}"`,
                        variables: null
                    });
                }
            }
        }
        return functions;
    }

    private readI18nFileAsync(locale: string): Promise<{}> {
        const filename = this.fs.combinePath(this.i18nWorkspace, `${locale}.json`);
        return this.fs.readJsonFileAsync<{}>(filename);
    }

    private readConfigFileAsync(): Promise<I18nConfig> {
        const filename = this.fs.combinePath(this.workspaceFolder, I18nGenerator.i18nConfigFile);
        return this.fs.readJsonFileAsync<I18nConfig>(filename);
    }

    private async writeConfigFileAsync(config: I18nConfig): Promise<void> {
        const filename = this.fs.combinePath(this.workspaceFolder, I18nGenerator.i18nConfigFile);
        await this.fs.writeJsonFileAsync(filename, config);
    }

    private async writeI18nFileAsync(locale: string, i18n: any): Promise<void> {
        const filename = this.fs.combinePath(this.i18nWorkspace, `${locale}.json`);
        await this.fs.writeJsonFileAsync(filename, i18n);
    }

    private async removeI18nFileAsync(locale: string): Promise<void> {
        const filename = this.fs.combinePath(this.i18nWorkspace, `${locale}.json`);
        await this.fs.deleteFileAsync(filename);
    }

    private getParameters(variables: string[]): string {
        let parameters = "";
        for (const variable of variables) {
            if (parameters.length > 0) {
                parameters += ", ";
            }
            parameters += `String ${variable}`;
        }
        return parameters;
    }

    private normalizeLocale(name: string): string {
        name = name.replace("-", "_");
        return name;
    }

    private updateRtl(config: I18nConfig, locale: string) {
        if (!config.ltr) {
            config.ltr = [];
        }
        if (!config.rtl) {
            config.rtl = [];
        }
        if (config.ltr.includes(locale) || config.rtl.includes(locale)) {
            return;
        }

        const isRtl = RtlDetect.isRtlLang(locale);
        if (isRtl) {
            config.rtl.push(locale);
        } else {
            config.ltr.push(locale);
        }
    }

    private removeRtl(config: I18nConfig, locale: string) {
        if (config.rtl) {
            const index = config.rtl.indexOf(locale);
            if (index >= 0) {
                config.rtl.splice(index, 1);
            }
        }
        if (config.ltr) {
            const index = config.ltr.indexOf(locale);
            if (index >= 0) {
                config.ltr.splice(index, 1);
            }
        }
    }

    private parseVariables(text: string): string[] | null {
        if (!text) {
            return null;
        }

        const variables: string[] = [];
        const variableRegex = /{(\w+)}/g;
        let matches: RegExpExecArray | null;
        while (matches = variableRegex.exec(text)) {
            variables.push(matches[1]);
        }
        return variables.length ? variables : null;
    }

    private replaceVariables(text: string, variables: string[]): string {
        for (const variable of variables) {
            text = text.replace(new RegExp(`{${variable}}`, "g"), `$\{${variable}\}`);
        }
        return text;
    }

    private validateLocale = (locale: string): string | null => {
        if (locale) {
            if (!LocaleCode.validate(locale)) {
                return "Locale not valid.";
            }
        }

        // no errors
        return null;
    }

    private validateLocaleNotEmpty = (locale: string): string | null => {
        if (!locale) {
            return "Locale cannot be empty";
        }
        return this.validateLocale(locale);
    }

    private static readonly dart = `import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
// ignore_for_file: non_constant_identifier_names
// ignore_for_file: camel_case_types
// ignore_for_file: prefer_single_quotes
// ignore_for_file: unnecessary_brace_in_string_interps

//WARNING: This file is automatically generated. DO NOT EDIT, all your changes would be lost.

typedef void LocaleChangeCallback(Locale locale);

class I18n implements WidgetsLocalizations {
  const I18n();
  static Locale locale;

  static const GeneratedLocalizationsDelegate delegate =
    const GeneratedLocalizationsDelegate();

  /// function to be invoked when changing the language
  static LocaleChangeCallback onLocaleChanged;

  static I18n of(BuildContext context) =>
    Localizations.of<I18n>(context, WidgetsLocalizations);

  @override
  TextDirection get textDirection => TextDirection.ltr;

  {functions}
}
`;

    private static readonly dartLocale = `
class _I18n_{locale} extends {derived} {
  const _I18n_{locale}();{functions}

  @override
  TextDirection get textDirection => TextDirection.{textDirection};
}
`;

    private static readonly dartGeneratedLocalizationsDelegate = `
class GeneratedLocalizationsDelegate extends LocalizationsDelegate<WidgetsLocalizations> {
  const GeneratedLocalizationsDelegate();
  Locale _locale;
  List<Locale> get supportedLocales {
    return const <Locale>[
      {locales}
    ];
  }

  LocaleResolutionCallback resolution({Locale fallback}) {
    return (Locale locale, Iterable<Locale> supported) {
      if (this.isSupported(locale)) {
        return locale;
      }
      final Locale fallbackLocale = fallback ?? supported.first;
      return fallbackLocale;
    };
  }

  @override
  Future<WidgetsLocalizations> load(Locale _locale) {
    I18n.locale ??= _locale;
    final Locale locale = I18n.locale;
    final String lang = locale != null ? locale.toString() : "";
    final String languageCode = locale != null ? locale.languageCode : "";
    {cases}
    return new SynchronousFuture<WidgetsLocalizations>(const I18n());
  }

  @override
  bool isSupported(Locale locale) {
    for (var i = 0; i < supportedLocales.length && locale != null; i++) {
      final l = supportedLocales[i];
      if (l.languageCode == locale.languageCode) {
        return true;
      }
    }
    return false;
  }

  @override
  bool shouldReload(GeneratedLocalizationsDelegate old) => {shouldReloadBool};
}`;
}

