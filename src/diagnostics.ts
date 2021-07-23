import * as vscode from 'vscode';
import {
  docs2typos
} from './spellcheck';

/** Code that is used to associate diagnostic entries with code actions. */
export const HANSPELL_MENTION = 'hanspell';

export function getHanspellDiagnostics(
  doc: vscode.TextDocument
): HanspellDiagnostic[] {
  return hanspellDiagnostics.get(doc.uri) as HanspellDiagnostic[];
}

// vscode.window.showInformationMessage("createDiagnosticCollection called.",);
const hanspellDiagnostics =
  vscode.languages.createDiagnosticCollection("hanspell");

export function refreshDiagnostics(
  doc: vscode.TextDocument
): void {
  const typos = docs2typos.get(doc);

  if (!typos) {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];

  typos.forEach((typo: any) => {
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

export class HanspellDiagnostic extends vscode.Diagnostic {
  typo: any;

  constructor(
    typo: any,
    range: vscode.Range,
    message: string,
    severity?: vscode.DiagnosticSeverity | undefined
  ) {
    super(range, message, severity);
    this.typo = typo;
  }
}

function createDiagnostic(
  lineIndex: number,
  column: number,
  typo: any
): HanspellDiagnostic {
  // create range that represents, where in the document the word is
  const range = new vscode.Range(
    lineIndex,
    column,
    lineIndex,
    column + typo.token.length,
  );

  const diagnostic =
    new HanspellDiagnostic(
      typo,
      range,
      typo.info ? typo.info : '맞춤법 교정',
      vscode.DiagnosticSeverity.Warning
    );
  diagnostic.code = HANSPELL_MENTION;

  return diagnostic;
}

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