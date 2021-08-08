/**
 * Defines diagnostic data structure containing a typo for a range of a
 * document.
 */

import * as vscode from 'vscode';

import { getTyposOfDocument } from './spellcheck';
import { HanspellTypo } from './typo';

/**
 * Used to associate diagnostic entries with code actions.
 */
export const HANSPELL_MENTION = 'hanspell';

/** Dictionary of `vscode.TextDocument` to `HanspellDiagnostic[]`. */
const hanspellDiagnostics =
  vscode.languages.createDiagnosticCollection('hanspell');

/** Returns the diagnostics for the given document. */
export function getHanspellDiagnostics(
  doc: vscode.TextDocument,
): HanspellDiagnostic[] {
  return hanspellDiagnostics.get(doc.uri) as HanspellDiagnostic[];
}

/**
 * Makes the diagnostics out of typos of document.
 *
 * Automatically called when the document is edited.
 */
export function refreshDiagnostics(doc: vscode.TextDocument): void {
  const typos = getTyposOfDocument(doc);

  if (!typos) {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];

  typos.forEach((typo: HanspellTypo) => {
    if (typo.regex === undefined) {
      return;
    }
    typo.regex.lastIndex = 0;

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
      const line = doc.lineAt(lineIndex).text;
      while (typo.regex.exec(line)) {
        diagnostics.push(
          new HanspellDiagnostic(
            lineIndex,
            typo.regex.lastIndex - typo.token.length,
            typo,
          ),
        );
      }
    }
  });

  hanspellDiagnostics.set(doc.uri, diagnostics);
}

/** Diagnostic data structure containing a typo for a range of a document. */
export class HanspellDiagnostic extends vscode.Diagnostic {
  typo: HanspellTypo;

  constructor(lineIndex: number, column: number, typo: HanspellTypo) {
    const range = new vscode.Range(
      lineIndex,
      column,
      lineIndex,
      column + typo.token.length,
    );

    super(
      range,
      typo.info,
      typo.common !== false
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Information,
    );

    this.typo = typo;
    this.code = HANSPELL_MENTION;
  }
}

/** Subscribes `refreshDiagnostics` to documents change events. */
export function subscribeHanspellDiagnosticsToDocumentChanges(
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(hanspellDiagnostics);

  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((editor) =>
      refreshDiagnostics(editor.document),
    ),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      hanspellDiagnostics.delete(doc.uri),
    ),
  );
}
