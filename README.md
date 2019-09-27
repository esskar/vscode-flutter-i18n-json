# vscode-flutter-i18n-json

VS Code extension to create a binding between your translations from .json files and your Flutter app. You can also automagically generate translations for all your locales, based on Google Translate.

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

### Flutter I18n Json: Set Google Translate API Code

Sets the API code for the Google Translate API.

To obtain an API key, you need to have an account with the Google Cloud Platform:

* Go to: https://console.developers.google.com/apis/dashboard
* Select (or create) a project
* Click button "Enable API's and services" (on top)
* Search for "Cloud Translation API"
* Click "Enable"
* Once enabled, go to the "Credentials" (left side) section on your API overview
* Click "Create credential" (top bar)
* In de text "We'll help you set up the correct credentials. 
If you want you can skip this step and create an API key, client ID or service account.", **choose the link "API key"**.
* Give it a name and click "Create"

You can copy the key now.

The following file will be updated:

    i18nconfig.json

### Flutter I18n Json: Create automagic translations from default locale

Generates and adds missing translations to `i18n/<locale>.json` files, based on the translation keys and values in `i18n/<default-locale>.json`.

When using this command, you don't have to manually add every translation key and translated value to all `i18n/<locale>.json` files.

## Usage

### JSON

Use a simple key-value pair JSON format to define your translations.

```json
{
    "hello": "Hello"
}
```

In the above example `"hello"` is the key for the translation value `"Hello!"`. 

Placeholders are automatically detected and are enclosed in curly brackets (`{}`):

```json
{
    "greetTo": "Hello {name}"
}
```

Here, `{name}` is a placeholder within the translation value for `"greetTo"`.

### Dart

Let's add some translations in `i18n/en-US.json`:

```json
{
    "hello": "Hello!",
    "greetTo": "Nice to meet you, {name}!"
}
```

After you run the update command, you will see that in `lib/generated/i18n.dart`, a getter `hello` and a method `greetTo` were created:

```dart
class I18n implements WidgetsLocalizations {
  const I18n();

  static const GeneratedLocalizationsDelegate delegate = 
    const GeneratedLocalizationsDelegate();

  static I18n of(BuildContext context) =>
    Localizations.of<I18n>(context, WidgetsLocalizations);

  @override
  TextDirection get textDirection => TextDirection.ltr;

  String get hello => "Hello!";
  String greetTo(String name) => "Nice to meet you, ${name}!";
}
```

Using the generated `I18n` class is showcased in the example below:

```dart
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
```

When translating something, simply call your translation like this:

```dart
I18n.of(context).hello
```
_This returns a string you can direcly use in e.g. a Text() widget_

### Nesting

Nesting is supported which allows you to hierarchically structure the translations.

```json
{
    "hello": "hello!",
    "greeting": {
        "formal": "Hello",
        "informal": "Hi",
        "placeholder": {
            "formal": "Hello {name}",
            "informal": "Hi {name}"
        }
    }
}
```

The above file will generate the following dart code

```dart
/// "hello!"
String get hello => "hello!";
/// "Hello"
String get greetingFormal => "Hello";
/// "Hi"
String get greetingInformal => "Hi";
/// "Hello ${name}"
String greetingPlaceholderFormal(String name) => "Hello ${name}";
/// "Hi ${name}"
String greetingPlaceholderInformal(String name) => "Hi ${name}";
````

### Arrays

Arrays of strings is supported too.

```json
{
    "hello": "hello!",
    "greetings": [
        "Hello",
        "Hi"
    ]
}
```

The above file will generate the following dart code

```dart
/// "hello!"
String get hello => "hello!";
/// ["Hello", "Hi"]
List<String> get greetings => ["Hello", "Hi"];
````

### Changing locale manually

Locale can be changed manually using static `locale` parameter. To make application reload from anywhere in the app you can use static `onLocaleChanged` callback:

```dart
import 'package:flutter_localizations/flutter_localizations.dart';

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final i18n = I18n.delegate;

  @override
  void initState() {
    super.initState();
    I18n.onLocaleChanged = onLocaleChange;
  }

  void onLocaleChange(Locale locale) {
    setState(() {
      I18n.locale = locale;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: app,
      localizationsDelegates: [
        i18n,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate // <-- needed for iOS
      ],
      supportedLocales: i18n.supportedLocales,
     home: <your home widget>
    );
  }
}
```

Calling this anywhere in your app will now change the app's language

```dart
I18n.onLocaleChanged(newLocale);
```



### Generate translations

After you run the Create automagic translations-command, all translation files will be supplemented with the new translations.

For instance, if you added the `greetTo` key from above, with this command your `i18n/es-ES.json` goes from

```json
{
    "hello": "¡Hola!"
}
```
to

```json
{
    "hello": "¡Hola!",
    "greetTo": "Encantado de conocerte, {name}!"
}
```



The **run the update command** will run automatically after any successful automagic translation, so you'll see that the Spanish WidgetsLocalizations are updated as:

```dart
class _I18n_es_ES extends I18n {
  const _I18n_es_ES();

  @override
  String get hello => "¡Hola!";
  @override
  String greetTo(String name) => "Encantado de conocerte, ${name}!";
}
```
## Text direction

Starting form version 0.12.0 the module detects the text direction automatically - based on the language code.
If you want to change the automatic behaviour, you can change the text direction in the `i18nconfig.json` file:

    {
      rtl: ["ar-AR"],
      ltr: []
    }


## Troubleshooting

### iOS

By default, your languages are not supported by iOS out of the box. To enable them, add the following to your `your_project/ios/Runner/Info.plist` file:

```xml
<key>CFBundleLocalizations</key>
  <array>
    <string>en</string>
    <string>es</string>
    <string>ru</string>
  </array>
```
_(with `en`, `es` and `ru` being examples for English, Spanish and Russian)_

Your file should look something like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleLocalizations</key>
  <array>
    <string>en</string>
    <string>es</string>
    <string>ru</string>
  </array>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
.
.
.
etc...
```


[1]: https://marketplace.visualstudio.com/items?itemName=esskar.vscode-flutter-i18n-json
There are still some [unresolved issues][2] in Flutter when trying to use localization with the iOS simulators. For more information to address this issue check the [flutter documentation][3]. 

### No Material-/CupertinoLocalizations found.

Global widgets may throw exceptions informaing you that they cannot find any MaterialLocalizations (`No MaterialLocalizations found.`). You need to install them manually and add their delegates to your localizationsDelegates.

in your pubspec.yaml:

    dev_dependencies:
      flutter_localizations:
        sdk: flutter

in your app:

```dart
import 'package:flutter_localizations/flutter_localizations.dart';

return new MaterialApp(
    localizationsDelegates: [
      i18n,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate
      ...
```

[1]: https://marketplace.visualstudio.com/items?itemName=esskar.vscode-flutter-i18n-json
[2]: https://github.com/flutter/flutter/issues/14128
[3]: https://flutter.dev/docs/development/accessibility-and-localization/internationalization#appendix-updating-the-ios-app-bundle
