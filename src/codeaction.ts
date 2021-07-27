/**
 * Defines HanspellCodeAction.
 *
 * HanspellTypo makes HanspellDiagnostic makes HanspellCodeAction.
 */

import * as vscode from 'vscode';
import { HANSPELL_MENTION, HanspellDiagnostic } from './diagnostics';

/**
 * Provides code actions for the commands of vscode-hanspell.fixTypo and
 * vscode-hanspell.fixAllTypos.
 */
export class HanspellCodeAction implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    let actions: vscode.CodeAction[] = [];

    const hanspellDiagnostics = context.diagnostics.filter(
      (d) => d.code === HANSPELL_MENTION,
    ) as HanspellDiagnostic[];

    if (!hanspellDiagnostics.length) {
      return [];
    }

    hanspellDiagnostics.forEach((diagnostic) => {
      actions = actions.concat(
        this.createFixTypoCommandCodeActions(diagnostic, document),
      );
    });

    const action = new vscode.CodeAction(
      '맞춤법 오류 모두 교정',
      vscode.CodeActionKind.QuickFix,
    );

    action.command = {
      command: 'vscode-hanspell.fixAllTypos',
      title: 'Fix all typos',
      arguments: [{ document }],
    };
    action.diagnostics = [...context.diagnostics];

    actions.push(action);

    return actions;
  }

  private createFixTypoCommandCodeActions(
    diagnostic: HanspellDiagnostic,
    document: vscode.TextDocument,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    diagnostic.typo.suggestions.forEach((suggestion: string) => {
      const action = new vscode.CodeAction(
        `⤷ ${suggestion}`,
        vscode.CodeActionKind.QuickFix,
      );
      action.command = {
        command: 'vscode-hanspell.fixTypo',
        title: 'Fix a typo',
        arguments: [{ document, suggestion, range: diagnostic.range }],
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
