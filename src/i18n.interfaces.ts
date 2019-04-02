export interface I18nConfig {
    defaultLocale: string;
    locales: string[];
    localePath: string;
    generatedPath: string;
    GoogleTranslateApiKey: string;
}

export interface I18nFunction {
    name: string;
    signature: string;
    body: string;
    variables: string[] | null;
}