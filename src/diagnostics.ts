/**
 * Defines diagnostic data structure containing a typo for a range of a
 * document.
 */

import * as vscode from 'vscode';

import { getTyposOfDocument, HanspellTypo } from './spellcheck';

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

function isLetter(char: string): boolean {
  return (
    (char >= 'ㄱ' && char <= 'ㅎ') ||
    (char >= 'ㅏ' && char <= 'ㅣ') ||
    (char >= '가' && char <= '힣') ||
    (char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z')
  );
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
    const token = typo.token;
    const tokenLen = token.length;
    const tokenBeginsWithLetter = isLetter(token[0]);
    const tokenEndsWithLetter = isLetter(token[token.length - 1]);

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
      const line = doc.lineAt(lineIndex).text;
      const lineLen = line.length;

      let start = 0;
      let found = -1;
      while (((found = line.indexOf(token, start)), found !== -1)) {
        // Checks word boundary.
        if (
          // Left boundary.
          (!tokenBeginsWithLetter ||
            found == 0 ||
            !isLetter(line[found-1])) &&
          // Right boundary.
          (!tokenEndsWithLetter ||
            found + tokenLen == lineLen ||
            !isLetter(line[found+tokenLen]))
        ) {
          diagnostics.push(new HanspellDiagnostic(lineIndex, found, typo));
        }
        start = found + 1;
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

    super(range, getTypoInfo(typo), vscode.DiagnosticSeverity.Warning);

    this.typo = typo;
    this.code = HANSPELL_MENTION;
  }
}

/** PNU service has good typo.info, but DAUM service does not. So we ... */
function getTypoInfo(typo: HanspellTypo): string {
  if (typo.info) {
    return typo.info;
  } else if (typo.type === 'space') {
    return '띄어쓰기 오류';
  } else {
    return '맞춤법 오류';
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
    vscode.workspace.onDidChangeTextDocument((e) =>
      refreshDiagnostics(e.document),
    ),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) =>
      hanspellDiagnostics.delete(doc.uri),
    ),
  );
}
