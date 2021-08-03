/**
 * Defines the functions for the code action commands, and registers spellCheck
 * commands, `refreshDiagnostics`, and them.
 */

import * as vscode from 'vscode';

import { HanspellCodeAction } from './codeaction';
import {
  spellCheckByDAUM,
  spellCheckByPNU,
  spellCheckByAll,
} from './spellcheck';
import {
  subscribeHanspellDiagnosticsToDocumentChanges,
  getHanspellDiagnostics,
} from './diagnostics';

/** Called once the extension is activated. */
export function activate(context: vscode.ExtensionContext) {
  // Subscribes `refreshDiagnostics` to documents change events.
  subscribeHanspellDiagnosticsToDocumentChanges(context);

  // Registers the code actions for `vscode-hanspell.fixTypo`,
  // `vscode-hanspell.fixAllTypos`, and `vscode-hanspell.fixCommonTypos`.
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      '*',
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.fixCommonTypos',
      fixCommonTypos,
    ),
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.spellCheckByAll',
      spellCheckByAll,
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
  const edit = new vscode.WorkspaceEdit();
  edit.replace(args.document.uri, args.range, args.suggestion);
  vscode.workspace.applyEdit(edit);
}

/**
 * Fixes all the typos of the document.
 *
 * Called by 'vscode-hanspell.fixAllTypos' code action command.
 */
function fixAllTypos(args: { document: vscode.TextDocument }) {
  const edit = new vscode.WorkspaceEdit();
  const uri = args.document.uri;

  getHanspellDiagnostics(args.document).forEach((diagnostic) => {
    edit.replace(uri, diagnostic.range, diagnostic.typo.suggestions[0]);
  });
  vscode.workspace.applyEdit(edit);
}

/**
 * Fixes all the typos of the document common in PNU and DAUM services.
 *
 * Called by 'vscode-hanspell.fixCommonTypos' code action command.
 */
function fixCommonTypos(args: { document: vscode.TextDocument }) {
  const edit = new vscode.WorkspaceEdit();
  const uri = args.document.uri;

  getHanspellDiagnostics(args.document).forEach((diagnostic) => {
    if (!diagnostic.typo.duplicated) {
      return;
    }

    edit.replace(uri, diagnostic.range, diagnostic.typo.suggestions[0]);
  });
  vscode.workspace.applyEdit(edit);
}
