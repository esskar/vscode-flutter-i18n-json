import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, extension "vscode-flutter-i18n-json" is now active!');

	const flutterI18nJsonInit = vscode.commands.registerCommand('extension.flutterI18nJsonInit', () => {

	});

	context.subscriptions.push(flutterI18nJsonInit);
}

export function deactivate() {}
