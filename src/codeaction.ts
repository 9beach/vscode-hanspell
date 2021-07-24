/**
 * Defines HanspellCodeAction.
 * 
 * HanspellTypo makes HanspellDiagnostic makes HanspellCodeAction.
 */

import * as vscode from 'vscode';
import { HANSPELL_MENTION, HanspellDiagnostic } from './diagnostics';
import { getTyposOfDocument } from './spellcheck';

/**
 * Provides code actions for the commands of vscode-hanspell.fixTypo and
 * vscode-hanspell.fixAllTypos.
 */
export class HanspellCodeAction implements vscode.CodeActionProvider {
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

    if (!getTyposOfDocument(document) || !getTyposOfDocument(document).length) {
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