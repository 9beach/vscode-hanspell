import * as vscode from 'vscode';
import {
  HANSPELL_MENTION,
  subscribeHanspellDiagnosticsToDocumentChanges,
  getHanspellDiagnostics,
  HanspellDiagnostic
} from './diagnostics';
import { spellCheckByDAUM, spellCheckByPNU, docs2typos } from './spellcheck';

export function activate(context: vscode.ExtensionContext) {
  subscribeHanspellDiagnosticsToDocumentChanges(context);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ['markdown', 'plaintext'],
      new Hanspell(),
      { providedCodeActionKinds: Hanspell.providedCodeActionKinds }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hanspell.fixTypo', fixTypo)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-hanspell.fixAllTypos', fixAllTypos)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.spellCheckByDAUM',
      spellCheckByDAUM
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-hanspell.spellCheckByPNU',
      spellCheckByPNU
    )
  );
}

/**
 * Function for 'vscode-hanspell.fixTypo' code action.
 */
function fixTypo(
  args: {
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    suggestion: string,
  }
) {
  let edit = new vscode.WorkspaceEdit();
  edit.replace(args.document.uri, args.range, args.suggestion);
  vscode.workspace.applyEdit(edit);
}

/**
 * Function for 'vscode-hanspell.fixAllTypos' code action.
 */
function fixAllTypos(
  args: {
    document: vscode.TextDocument
  }
) {
  let edit = new vscode.WorkspaceEdit();
  let uri = args.document.uri;

  getHanspellDiagnostics(args.document).forEach(diagnostic => {
    edit.replace(uri, diagnostic.range, diagnostic.typo.suggestions[0]);
  });
  vscode.workspace.applyEdit(edit);
}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class Hanspell implements vscode.CodeActionProvider {

  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    let actions: vscode.CodeAction[] = [];

    if (!docs2typos.get(document) || !docs2typos.get(document).length) {
      return actions;
    }

    const hanspellDiagnostics =
      context.diagnostics
        .filter(diagnostic => diagnostic.code === HANSPELL_MENTION) as
      HanspellDiagnostic[];

    hanspellDiagnostics.forEach(diagnostic => {
      actions = actions.concat(
        this.createFixTypoCommandCodeActions(
          diagnostic,
          document,
        )
      );
    });

    if (hanspellDiagnostics.length) {
      let action = new vscode.CodeAction(
        '맞춤법 오류 모두 교정',
        vscode.CodeActionKind.QuickFix
      );

      action.command = {
        command: 'vscode-hanspell.fixAllTypos',
        title: 'Fix all typos',
        arguments: [{
          document,
        }],
      };
      action.diagnostics = [...context.diagnostics];

      actions.push(action);
    }

    return actions;
  }

  private createFixTypoCommandCodeActions(
    diagnostic: HanspellDiagnostic,
    document: vscode.TextDocument
  ): vscode.CodeAction[] {
    let actions: vscode.CodeAction[] = [];

    diagnostic.typo.suggestions.forEach((suggestion: string) => {
      const action = new vscode.CodeAction(
        `⤷ ${suggestion}`,
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        command: 'vscode-hanspell.fixTypo',
        title: 'Fix a typo',
        arguments: [{
          document,
          suggestion,
          'range': diagnostic.range,
        }],
      };
      action.diagnostics = [diagnostic];

      actions.push(action);
    });

    if (actions.length) {
      actions[0].isPreferred = true;
    }

    return actions;
  }
}