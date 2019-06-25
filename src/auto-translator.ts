import { I18nConfig } from "./i18n.interfaces";
import * as request from "request-promise-native";

// Translates given strings to specified locale,
// using global I18nConfig having API key and defaultLocale
export class AutoTranslator {

  constructor(private config: I18nConfig) {
  }

  async translate(input: String, locale: string): Promise<String> {
    const key = this.config.googleTranslateApiKey;
    if (!key) {
      throw "googleTranslateApiKey is not set.";
    }

    const query = {
      q: input,
      source: this.config.defaultLocale.substr(0, 2),
      target: locale.substr(0, 2)
    };

    const options = {
      uri: `https://www.googleapis.com/language/translate/v2?key=${key}`,
      method: "POST",
      qs: query,
      headers: {
        "User-Agent": "Request-Promise"
      },
      json: true // Automatically parses the JSON string in the response
    };

    const result = await request(options);
    return result.data.translations[0].translatedText;
  }
}
