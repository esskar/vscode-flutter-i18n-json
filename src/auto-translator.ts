import { I18nConfig } from "./i18n.interfaces";
import { Variables } from "./variables";

interface GoogleError {
  error?: GoogleError;
  code?: number;
  message?: string;
  errors?: GoogleError[];
  status?: string;
}

interface GoogleTranslation {
  originalText: string;
  translatedText: string;
}

// Translates given strings to specified locale,
// using global I18nConfig having API key and defaultLocale
export class AutoTranslator {

  private readonly varibales = new Variables();

  constructor(private config: I18nConfig) {
  }

  async translate(input: String, locale: string): Promise<string> {
    const apiKey = this.config.googleTranslateApiKey;
    if (!apiKey) {
      return Promise.reject("googleTranslateApiKey is not set.");
    }

    try {
      const source = this.config.defaultLocale.substr(0, 2);
      const target = locale.substr(0, 2);

      const googleTranslate = require('google-translate')(apiKey);
      return new Promise<string>((resolve, reject) => {
        googleTranslate.translate(input, source, target, (error: any, translation: GoogleTranslation) => {
          if (error) {
            if (error.body) {
              const ge = JSON.parse(error.body) as GoogleError;
              const message = ge.message || ge.error && ge.error.message;
              reject(message);
            } else {
              reject(error);
            }
          } else {
            const result = this.handleTranslation(translation);
            resolve(result);
          }
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private handleTranslation(translation: GoogleTranslation): string {
    const originalVars = this.varibales.parseVariables(translation.originalText) || [];
    const translatedVars = this.varibales.parseVariables(translation.translatedText) || [];

    const result = this.varibales.replaceVariablesWithVariables(
      translation.translatedText, translatedVars, originalVars);
    return result;
  }
}
