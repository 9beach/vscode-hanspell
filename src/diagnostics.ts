/**
 * Defines diagnostic data structure containing a typo for a range of a 
 * document.
 */

import { type } from 'os';
import * as vscode from 'vscode';

import { getTyposOfDocument, HanspellTypo } from './spellcheck';

/**
 * Used to associate diagnostic entries with code actions.
 */
export const HANSPELL_MENTION = 'hanspell';

/** Dictionary of `vscode.TextDocument` to `HanspellDiagnostic[]`. */
const hanspellDiagnostics =
  vscode.languages.createDiagnosticCollection("hanspell");

/** Returns the diagnostics for the given document. */
export function getHanspellDiagnostics(
  doc: vscode.TextDocument
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
    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
      const lineOfText = doc.lineAt(lineIndex);

      let start = 0;
      let found = -1;
      while (found = lineOfText.text.indexOf(typo.token, start), found !== -1) {
        diagnostics.push(createDiagnostic(lineIndex, found, typo));
        start = found + 1;
      }
    }
  });

  hanspellDiagnostics.set(doc.uri, diagnostics);
}

/** Diagnostic data structure containing a typo for a range of a document. */
export class HanspellDiagnostic extends vscode.Diagnostic {
  typo: HanspellTypo;

  constructor(
    range: vscode.Range,
    message: string,
    typo: HanspellTypo
  ) {
    super(range, message, vscode.DiagnosticSeverity.Warning);
    this.typo = typo;
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

/** Creates a diagnostic for the given typo and range. */
function createDiagnostic(
  lineIndex: number,
  column: number,
  typo: HanspellTypo
): HanspellDiagnostic {
  const range = new vscode.Range(
    lineIndex,
    column,
    lineIndex,
    column + typo.token.length,
  );

  const diagnostic = new HanspellDiagnostic(range, getTypoInfo(typo), typo);
  diagnostic.code = HANSPELL_MENTION;

  return diagnostic;
}

/** Subscribes `refreshDiagnostics` to documents change events. */
export function subscribeHanspellDiagnosticsToDocumentChanges(
  context: vscode.ExtensionContext,
): void {
  context.subscriptions.push(hanspellDiagnostics);

  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      vscode.window.activeTextEditor.document,
    );
  }
  
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        refreshDiagnostics(editor.document);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(
      e => refreshDiagnostics(e.document)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(
      doc => hanspellDiagnostics.delete(doc.uri)
    )
  );
}
