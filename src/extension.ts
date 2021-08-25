/**
 * Defines the functions for the code action commands, and registers all the
 * commands and `refreshDiagnostics`.
 */

import * as vscode from 'vscode';

import { HanspellTypo } from './typo';
import { DocumentsToTypos } from './spellcheck';
import { HanspellIgnore } from './ignore';
import { HanspellHistory } from './history';
import { HanspellCodeAction } from './codeaction';
import {
  spellCheckByDAUM,
  spellCheckByPNU,
  spellCheckByAll,
} from './spellcheck-commands';
import {
  subscribeDiagnosticsToDocumentChanges,
  getHanspellDiagnostics,
  refreshDiagnostics,
} from './diagnostics';

/** Called once the extension is activated. */
export function activate(context: vscode.ExtensionContext) {
  HanspellHistory.backupIfTooLarge();

  // Subscribes `refreshDiagnostics` to documents change events.
  subscribeDiagnosticsToDocumentChanges(context);

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
    vscode.commands.registerCommand('vscode-hanspell.ignoreTypo', ignoreTypo),
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
 * Called by `vscode-hanspell.fixTypo` code action command.
 */
function fixTypo(args: {
  document: vscode.TextDocument;
  range: vscode.Range | vscode.Selection;
  token: string;
  suggestion: string;
}) {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(args.document.uri, args.range, args.suggestion);
  HanspellHistory.writeOnce(`${args.token} -> ${args.suggestion}\n`);
  vscode.workspace.applyEdit(edit);
}

/**
 * Adds given token to `~/.hanspell-ignore`).
 *
 * Called by `vscode-hanspell.ignoreTypo` code action command.
 */
function ignoreTypo(args: { document: vscode.TextDocument; token: string }) {
  HanspellIgnore.append(args.token);
  const typos = DocumentsToTypos.getTypos(args.document);
  DocumentsToTypos.setTypos(
    args.document,
    typos.filter((typo: HanspellTypo) => typo.token !== args.token),
  );
  refreshDiagnostics(args.document);
}

/**
 * Fixes all the typos of the document.
 *
 * Called by `vscode-hanspell.fixAllTypos` code action command.
 */
function fixAllTypos(args: { document: vscode.TextDocument }) {
  const edit = new vscode.WorkspaceEdit();
  const uri = args.document.uri;
  const hist = new HanspellHistory();

  getHanspellDiagnostics(args.document).forEach((diagnostic) => {
    if (!diagnostic.suggestions.length) {
      return;
    }
    edit.replace(uri, diagnostic.range, diagnostic.suggestions[0]);
    hist.write(`${diagnostic.token} -> ${diagnostic.suggestions[0]}\n`);
  });

  vscode.workspace.applyEdit(edit);
  hist.end();
}

/**
 * Fixes all the typos of the document common in PNU and DAUM services.
 *
 * Called by `vscode-hanspell.fixCommonTypos` code action command.
 */
function fixCommonTypos(args: { document: vscode.TextDocument }) {
  const edit = new vscode.WorkspaceEdit();
  const uri = args.document.uri;
  const hist = new HanspellHistory();

  getHanspellDiagnostics(args.document).forEach((diagnostic) => {
    if (!diagnostic.suggestions.length || !diagnostic.typo.isCommon) {
      return;
    }
    edit.replace(uri, diagnostic.range, diagnostic.suggestions[0]);
    hist.write(`${diagnostic.token} -> ${diagnostic.suggestions[0]}\n`);
  });

  vscode.workspace.applyEdit(edit);
  hist.end();
}
