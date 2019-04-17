# vscode-flutter-i18n-json

VS Code extension to create a binding between your translations from .json files and your Flutter app.

## Installation

To install the extension just execute the following command:

    ext install vscode-flutter-i18n-json

You may also install the extension from the [visual studio code marketplace][1].

## Getting started

1. Install the extension
2. Open your project, open the command palette and find the `Flutter I18n Json: Initialize` command.
3. Enter a default locale, or press enter to use `en-US`.

![init-command](https://raw.githubusercontent.com/esskar/vscode-flutter-i18n-json/master/images/extension_init.gif)

## Commands

### Flutter I18n Json: Initialize

Creates the inital binding between translations from .json files and your Flutter app.
The command will ask you for the default locale, the locale that will be used when no other locale can be matched.

The following files will be created:

    i18n/<default-locale>.json
    lib/generated/i18n.dart
    i18nconfig.json

### Flutter I18n Json: Add locale

Adds another locale to your Flutter app.
The command will ask you for a new locale.

The following files will be created:

    i18n/<new-locale>.json

and updated:

    lib/generated/i18n.dart
    i18nconfig.json

### Flutter I18n Json: Update

After you change or add any translations, run the update command to update

    lib/generated/i18n.dart

to reflect your translation changes.

### Flutter I18n Json: Remove locale

Removes an existing locale from your Flutter app.
The command will ask you to pick a locale from the list of existing locales.

The following files will be removed:

    i18n/<existing-locale>.json

and updated:

    lib/generated/i18n.dart
    i18nconfig.json

## Usage

### JSON

Use a simple key-value pair JSON format to define your translations.

    {
        "hello": "Hello"
    }

In the above example `"hello"` is the key for the translation value `"Hello!"`. 

Placeholders are automatically detected and are enclosed in curly brackets (`{}`):

    {
        "greetTo", "Hello {name}"
    }

Here, `{name}` is a placeholder within the translation value for `"greetTo"`.

### Dart

Let's add some translations in `i18n/en-US.json`:

    {
        "hello": "Hello!",
        "greetTo": "Nice to meet you, {name}!"
    }

After you run the update command, you will see that in `lib/generated/i18n.dart`, a getter `hello` and a method `greetTo` were created:

    class I18n implements WidgetsLocalizations {
      const I18n();

      static const GeneratedLocalizationsDelegate delegate = 
        const GeneratedLocalizationsDelegate();

      static I18n of(BuildContext context) =>
        Localizations.of<I18n>(context, WidgetsLocalizations);

      @override
      TextDirection get textDirection => TextDirection.ltr;

      String get hello => "Hello!";
      String greetTo(String name) => "Nice to meet you, $name!";
    }

Using the generated `I18n` class is showcased in the example below:

    @override
    Widget build(BuildContext context) {
      final i18n = I18n.delegate;
      return new MaterialApp(
        localizationsDelegates: [
          i18n
        ],
        supportedLocales: i18n.supportedLocales,
        localeResolutionCallback: i18n.resolution(fallback: new Locale("en", "US"))
        // .. any other properties supported and required by your application
      );

## Text direction

Starting form version 0.12.0 the module detects the text direction automatically - based on the language code.
If you want to change the automatic behaviour, you can change the text direction in the `i18nconfig.json` file:

    {
      rtl: ["ar-AR"],
      ltr: []
    }

## Known problems

### iOS Simulator

There are still some [unresolved issues][2] in Flutter when trying to use localization with the iOS
simulators. 

[1]: https://marketplace.visualstudio.com/items?itemName=esskar.vscode-flutter-i18n-json
[2]: https://github.com/flutter/flutter/issues/14128