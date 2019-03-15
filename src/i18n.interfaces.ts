export interface I18nConfig {
    defaultLocale: string;
    locales: string[];
    localePath: string;
    generatedPath: string;
}

export interface I18nFunction {
    name: string;
    signature: string;
    body: string;
    variables: string[] | null;
}