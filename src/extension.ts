/**
 * Defines the functions for the code action commands, and registers spellCheck
 * commands, `refreshDiagnostics`, and them.
 */

import * as vscode from 'vscode';

import { HanspellCodeAction } from './codeaction';
import { spellCheckByDAUM, spellCheckByPNU } from './spellcheck';
import {
  subscribeHanspellDiagnosticsToDocumentChanges,
  getHanspellDiagnostics,
} from './diagnostics';

/** Called once the extension is activated. */
export function activate(context: vscode.ExtensionContext) {
  // Subscribes `refreshDiagnostics` to documents change events.
  subscribeHanspellDiagnosticsToDocumentChanges(context);

  // Registers the code actions for `vscode-hanspell.fixTypo` and
  // `vscode-hanspell.fixAllTypos`.
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ['markdown', 'plaintext'],
      new HanspellCodeAction(),
      { providedCodeActionKinds: HanspellCodeAction.providedCodeActionKinds },
    ),
  );

  // Binds code action commands to corresponding functions.
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hanspell.fixTypo', fixTypo),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hanspell.fixAllTypos', fixAllTypos),
  );

  // Binds commands to corresponding functions.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.spellCheckByDAUM',
      spellCheckByDAUM,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.spellCheckByPNU',
      spellCheckByPNU,
    ),
  );
}

/**
 * Fixes the typo of the given range of the document.
 *
 * Called by 'vscode-hanspell.fixTypo' code action command.
 */
function fixTypo(args: {
  document: vscode.TextDocument;
  range: vscode.Range | vscode.Selection;
  suggestion: string;
}) {
  let edit = new vscode.WorkspaceEdit();
  edit.replace(args.document.uri, args.range, args.suggestion);
  vscode.workspace.applyEdit(edit);
}

/**
 * Fixes all the typos of the document.
 *
 * Called by 'vscode-hanspell.fixAllTypos' code action command.
 */
function fixAllTypos(args: { document: vscode.TextDocument }) {
  let edit = new vscode.WorkspaceEdit();
  let uri = args.document.uri;

  getHanspellDiagnostics(args.document).forEach(diagnostic => {
    edit.replace(uri, diagnostic.range, diagnostic.typo.suggestions[0]);
  });
  vscode.workspace.applyEdit(edit);
}
