# vscode-flutter-i18n-json

VS Code extension to create a binding between your translations from .json files and your Flutter app.

## Installation

To install the extension just execute the following command:

    ext install vscode-flutter-i18n-json

You may also install the extension from the [visual studio code marketplace][1].

[1]: https://marketplace.visualstudio.com/items?itemName=esskar.vscode-flutter-i18n-json

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

### Flutter I18n Json: Add language

Adds another language to your Flutter app.
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