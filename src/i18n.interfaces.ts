export interface I18nConfig {
    rootFolder: string;
    defaultLocale: string;
    locales: string[];
    localePath: string;
    generatedPath: string;
    googleTranslateApiKey?: string;
    rtl?: string[];
    ltr?: string[];
}

export interface I18nFunction {
    name: string;
    signature: string;
    body: string;
    variables: string[] | null;
}