let LocaleCode = require('locale-code');
let RtlDetect = require('rtl-detect');

import { IDisposable } from "./disposable.interface";
import { I18nConfig, I18nFunction } from "./i18n.interfaces";
import { FileSystem } from "./file-system";
import { Hello } from "./hello";
import { UserActions } from "./user-actions";
import { AutoTranslator } from "./auto-translator";
import { InsertActionProviderDelegate } from "./InsertActionProvider";
import { Variables } from "./variables";

export class I18nGenerator implements IDisposable, InsertActionProviderDelegate {
    private static readonly defaultGeneratedPath = "lib/generated";
    private static readonly defaultI18nPath = "i18n";
    private static readonly defaultLocale = "en-US";
    private static readonly i18nConfigFile = "i18nconfig.json";

    private readonly hello = new Hello();
    private readonly varibales = new Variables();

    constructor(
        private workspaceFolder: string,
        private fs: FileSystem,
        private ua: UserActions) {
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
            generatedPath: I18nGenerator.defaultGeneratedPath
        };

        this.updateRtl(config, defaultLocale);

        await this.initializeAsync(config);
        await this.writeConfigFileAsync(config);
        await this.writeI18nFileAsync(defaultLocale, {
            greetTo: this.hello.get(LocaleCode.getCountryCode(defaultLocale))
        }, config);
        await this.generateDartFileAsync(config);

        this.ua.showInfo(`Successfully initialized localization with default locale '${defaultLocale}'.`);

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

        await this.initializeAsync(config);
        await this.writeConfigFileAsync(config);
        await this.writeI18nFileAsync(locale, {}, config);
        await this.generateDartFileAsync(config);

        this.ua.showInfo(`Successfully added locale '${locale}'.`);
    }

    async generateRemoveAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();
        let pickedLocale = await this.ua.pickAsync("Remove existing locale code", config.locales);
        if (!pickedLocale) {
            return;
        }

        if (config.defaultLocale === pickedLocale) {
            this.ua.showError(`Cannot remove the default locale '${pickedLocale}'.`);
            return;
        }

        const index = config.locales.indexOf(pickedLocale);
        if (index < 0) {
            this.ua.showError(`Cannot find locale '${pickedLocale}'.`);
            return;
        }

        config.locales.splice(index, 1);

        this.removeRtl(config, pickedLocale);

        await this.initializeAsync(config);
        await this.writeConfigFileAsync(config);
        await this.removeI18nFileAsync(pickedLocale, config);
        await this.generateDartFileAsync(config);

        this.ua.showInfo(`Successfully removed locale '${pickedLocale}'.`);
    }

    async generateUpdateAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();
        await this.initializeAsync(config);
        await this.generateDartFileAsync(config);

        this.ua.showInfo(`Successfully updated localization.`);
    }


    async generateGTranslateApiCodeAdd(): Promise<void> {
        const config = await this.readConfigFileAsync();
        const apiKey = await this.ua.promptAsync(
            "Set Google Translate API Key",
            "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", this.validateAPIKeyNotEmpty);
        if (!apiKey) {
            return;
        }

        config.googleTranslateApiKey = apiKey;

        await this.initializeAsync(config);
        await this.writeConfigFileAsync(config);
        this.ua.showInfo(`Saved Google Translate API key.`);
    }

    async generateTranslationsAsync(): Promise<void> {
        const config = await this.readConfigFileAsync();

        await this.initializeAsync(config);
        if (await this.generateAutoTranslationsAsync(config)) {
            this.ua.showInfo(`Translations created.`);
            await this.generateUpdateAsync();
        }
    }

    dispose(): void { }

    private async initializeAsync(config: I18nConfig): Promise<void> {
        await this.fs.createFolderAsync(this.fs.combinePath(this.workspaceFolder, config.generatedPath));
        await this.fs.createFolderAsync(this.fs.combinePath(this.workspaceFolder, config.localePath));
    }

    private async generateDartFileAsync(config: I18nConfig): Promise<void> {
        let dartContent = "";

        const defaultI18n = await this.readI18nFileAsync(config.defaultLocale || "", config);
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
                    const i18n = await this.readI18nFileAsync(locale, config);
                    const diff = this.diffFunctionTable(functions, i18n);
                    dartContent += this.generateFunctions(
                        I18nGenerator.dartLocale, locale, isRtl, config.locales, diff, true);
                } catch (e) {
                    console.error(`Failed to generate ${locale}: ${e}`);
                }
            }
        }

        dartContent += this.generateLocales(I18nGenerator.dartGeneratedLocalizationsDelegate, config);

        const path = this.fs.combinePath(this.workspaceFolder, config.generatedPath);
        const filename = this.fs.combinePath(path, "i18n.dart");
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

                functionsContent += `/// ${func.body}\n  `;

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
            localesContent += `Locale("${languageCode}", "${countryCode}")`;

            const normalized = this.normalizeLocale(locale);
            if (!languageCodes[languageCode]) {
                languageCodes[languageCode] = normalized;
            }
            if (casesContent.length > 0) {
                casesContent += "    else ";
            }
            casesContent += `if ("${normalized}" == lang) {\n`;
            casesContent += `      I18n.current = const _I18n_${normalized}();\n`;
            casesContent += "    }\n";
        }

        for (let languageCode in languageCodes) {
            if (languageCodes.hasOwnProperty(languageCode)) {
                const normalized = languageCodes[languageCode];
                casesContent += `    else if ("${languageCode}" == languageCode) {\n`;
                casesContent += `      I18n.current = const _I18n_${normalized}();\n`;
                casesContent += "    }\n";
            }
        }

        let result = template.replace("{locales}", localesContent);
        result = result.replace("{cases}", casesContent);
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
                    const body = this.varibales.replaceVariables(value, variables);
                    diffFunctions.push({
                        name: name,
                        signature: func.signature,
                        body: `"${this.escapeString(body)}"`,
                        variables: variables
                    });
                } else {
                    diffFunctions.push({
                        name: name,
                        signature: func.signature,
                        body: `"${this.escapeString(value)}"`,
                        variables: null
                    });
                }
            }
        }

        return diffFunctions;
    }

    createArrayBody(values: Array<string>) {
        let body = "[";
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            body += `"${this.escapeString(value)}"`;
            if (i !== values.length - 1) {
                body += ", ";
            }
        }

        body += "]";
        return body;
    }

    buildFunction(name: string, value: string | Array<string>): I18nFunction {
        if (value instanceof Array) {
            return {
                name: name,
                signature: `List<String> get ${name}`,
                body: this.createArrayBody(value as Array<string>),
                variables: null
            };
        }

        const variables = this.varibales.parseVariables(value as string);
        if (variables && variables.length > 0) {
            const body = this.varibales.replaceVariables(value as string, variables);
            const parameters = this.getParameters(variables);
            return {
                name: name,
                signature: `String ${name}(${parameters})`,
                body: `"${this.escapeString(body)}"`,
                variables: variables
            };
        } else {
            return {
                name: name,
                signature: `String get ${name}`,
                body: `"${this.escapeString(value as string)}"`,
                variables: null
            };
        }
    }

    private buildFunctionTable(i18n: any): I18nFunction[] {
        const functions: I18nFunction[] = [];
        for (const name in i18n) {
            if (i18n.hasOwnProperty(name)) {
                functions.push(this.buildFunction(name, i18n[name]));
            }
        }
        return functions;
    }

    private replaceAll(target: string, search: string, replacement: string): string {
        return target.replace(new RegExp(search, 'g'), replacement);
    }

    private escapeString(s: string): string {
        s = this.replaceAll(s, "\t", "\\t");
        s = this.replaceAll(s, "\r", "\\r");
        s = this.replaceAll(s, "\n", "\\n");
        s = this.replaceAll(s, "\"", "\\\"");
        return s;
    }

    async readConfigFileAsync(): Promise<I18nConfig> {
        const filename = this.fs.combinePath(this.workspaceFolder, I18nGenerator.i18nConfigFile);
        return await this.fs.readJsonFileAsync<I18nConfig>(filename);
    }

    async readI18nFileAsync(locale: string, config: I18nConfig, noFlat?: boolean): Promise<{ [id: string]: any }> {
        const path = this.fs.combinePath(this.workspaceFolder, config.localePath);
        const filename = this.fs.combinePath(path, `${locale}.json`);
        const jsonFileContent: any = await this.fs.readJsonFileAsync(filename);
        if (!noFlat) {
            return this.flattenObject(jsonFileContent);
        }
        return jsonFileContent;
    }

    async writeI18nFileAsync(locale: string, i18n: any, config: I18nConfig): Promise<void> {
        const path = this.fs.combinePath(this.workspaceFolder, config.localePath);
        const filename = this.fs.combinePath(path, `${locale}.json`);
        await this.fs.writeJsonFileAsync(filename, i18n);
    }

    private async writeConfigFileAsync(config: I18nConfig): Promise<void> {
        const filename = this.fs.combinePath(this.workspaceFolder, I18nGenerator.i18nConfigFile);
        await this.fs.writeJsonFileAsync(filename, config);
    }

    private async removeI18nFileAsync(locale: string, config: I18nConfig): Promise<void> {
        const path = this.fs.combinePath(this.workspaceFolder, config.localePath);
        const filename = this.fs.combinePath(path, `${locale}.json`);
        await this.fs.deleteFileAsync(filename);
    }

    private async generateAutoTranslationsSetAsync(
        translator: AutoTranslator,
        locale: string,
        availableKeys: string[],
        defaultSet: any,
        translationSet: any): Promise<boolean> {
        // Go over all availableKeys of default locale translation file
        const translationKeys = Object.keys(translationSet);
        for (let availableTranslation of availableKeys) {

            const value = defaultSet[availableTranslation];

            // Check if the translation was already made, if not, create translation
            const index = translationKeys.indexOf(availableTranslation);
            if (typeof value === "object") {
                let translatedValue = translationSet[availableTranslation];
                if (typeof translatedValue !== "object") {
                    translatedValue = translationSet[availableTranslation] = {};
                }
                if (!await this.generateAutoTranslationsSetAsync(translator, locale, Object.keys(value), value, translatedValue)) {
                    return false;
                }
            } else {
                if (index === -1) {
                    const originalText: String = value.toString();
                    const translation: String = await translator.translate(originalText, locale);
                    translationSet[availableTranslation] = translation;
                    console.log(`${availableTranslation} in ${locale} is ${translation}`);
                }
            }
        }

        return true;
    }

    private async generateAutoTranslationsAsync(config: I18nConfig): Promise<boolean> {
        // Get all the default translations
        const defaultI18n = await this.readI18nFileAsync(
            config.defaultLocale || "", config, true
        );
        // Initialize Translator
        const translator: AutoTranslator = new AutoTranslator(config);

        // All keys that are found in the default locale translation file.
        const availableKeys = Object.keys(defaultI18n);

        // For each available locale, while skipping the default locale,
        // get the already made translations and check if some translations
        // are missing. If so, make the translation and write the complete set
        // of the translations back to the json file.
        for (const locale of config.locales) {
            if (locale === config.defaultLocale) {
                continue;
            } else {
                try {
                    // Already made translations for current locale.
                    const translations: { [id: string]: any; } = await this.readI18nFileAsync(locale, config, true);

                    const result = await this.generateAutoTranslationsSetAsync(translator, locale, availableKeys, defaultI18n, translations);
                    if (!result) {
                        return result;
                    }

                    // Write translations for locale into its file.
                    this.writeI18nFileAsync(locale, translations, config);
                } catch (e) {
                    console.error(`Failed to build translations for ${locale}: ${e}`);
                    await this.ua.showError(`Failed to build translations for ${locale}: ${e}`);
                    return false; // Don't continue attempting to make additional translations.
                }
            }
        }
        return true;
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

    private validateAPIKeyNotEmpty = (locale: string): string | null => {
        if (!locale) {
            return "API Key cannot be empty";
        }
        return null;
    }

    private flattenObject = (obj: any): any => {
        const result: any = {};
        let index = 0;
        for (const property in obj) {
            if (!obj.hasOwnProperty(property)) { continue; }
            const values = Object.values(obj);
            const value = values[index];
            if (value instanceof Object && !(value instanceof Array)) {
                const flattenedSubObject = this.flattenObject(value);
                let subIndex = 0;
                for (const subProperty in flattenedSubObject) {
                    if (!flattenedSubObject.hasOwnProperty(subProperty)) { continue; }
                    result[property + subProperty.upperCaseFirstLetter()] = Object.values(flattenedSubObject)[subIndex];
                    subIndex++;
                }
            } else {
                // Populate with key-value pair
                result[property] = values[index];
            }
            index++;
        }
        return result;
    }

    private static readonly dart = `import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
// ignore_for_file: non_constant_identifier_names
// ignore_for_file: camel_case_types
// ignore_for_file: prefer_single_quotes
// ignore_for_file: unnecessary_brace_in_string_interps

//WARNING: This file is automatically generated. DO NOT EDIT, all your changes would be lost.

typedef LocaleChangeCallback = void Function(Locale locale);

class I18n implements WidgetsLocalizations {
  const I18n();
  static Locale _locale;
  static bool _shouldReload = false;
  static I18n current;

  static set locale(Locale newLocale) {
    _shouldReload = true;
    I18n._locale = newLocale;
  }

  static const GeneratedLocalizationsDelegate delegate = GeneratedLocalizationsDelegate();

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
  List<Locale> get supportedLocales {
    return const <Locale>[
      {locales}
    ];
  }

  LocaleResolutionCallback resolution({Locale fallback}) {
    return (Locale locale, Iterable<Locale> supported) {
      if (isSupported(locale)) {
        return locale;
      }
      final Locale fallbackLocale = fallback ?? supported.first;
      return fallbackLocale;
    };
  }

  @override
  Future<WidgetsLocalizations> load(Locale locale) {
    I18n._locale ??= locale;
    I18n._shouldReload = false;
    final String lang = I18n._locale != null ? I18n._locale.toString() : "";
    final String languageCode = I18n._locale != null ? I18n._locale.languageCode : "";
    {cases}
    I18n.current ??= const I18n();
    return SynchronousFuture<WidgetsLocalizations>(I18n.current);
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
  bool shouldReload(GeneratedLocalizationsDelegate old) => I18n._shouldReload;
}`;
}
