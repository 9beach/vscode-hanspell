/**
 * Defines `HanspellCodeAction` class.
 *
 * `HanspellTypo` makes `HanspellDiagnostic` makes `HanspellCodeAction`.
 */

import * as vscode from 'vscode';
import { HANSPELL_MENTION, HanspellDiagnostic } from './diagnostics';

/**
 * Provides code actions for the commands of `vscode-hanspell.fixTypo` and
 * `vscode-hanspell.fixAllTypos`.
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
    const ignores: vscode.CodeAction[] = [];

    const hanspellDiagnostics = context.diagnostics.filter(
      (diagnostic) => diagnostic.code === HANSPELL_MENTION,
    ) as HanspellDiagnostic[];

    if (!hanspellDiagnostics.length) {
      return [];
    }

    hanspellDiagnostics.forEach((diagnostic) => {
      actions = actions.concat(
        this.createFixTypoCommandCodeActions(diagnostic, document),
      );
      if (diagnostic.typo.token) {
        ignores.push(
          this.createIgnoreTypoCommandCodeAction(
            diagnostic.typo.token,
            document,
          ),
        );
      }
    });

    actions = actions.concat(ignores);

    if (!actions.length) {
      return actions;
    }

    if (
      hanspellDiagnostics.some(
        (diagnostic) => diagnostic.typo.isCommon === true,
      )
    ) {
      const action = new vscode.CodeAction(
        '다음, 부산대 공통 오류만 모두 교정',
        vscode.CodeActionKind.QuickFix,
      );

      action.command = {
        command: 'vscode-hanspell.fixCommonTypos',
        title: 'Fix common typos',
        arguments: [{ document }],
      };

      actions.push(action);
    }

    const action = new vscode.CodeAction(
      '맞춤법 오류 모두 교정',
      vscode.CodeActionKind.QuickFix,
    );

    action.command = {
      command: 'vscode-hanspell.fixAllTypos',
      title: 'Fix all typos',
      arguments: [{ document }],
    };

    actions.push(action);

    return actions;
  }

  private createFixTypoCommandCodeActions(
    diagnostic: HanspellDiagnostic,
    document: vscode.TextDocument,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    diagnostic.suggestions.forEach((suggestion: string) => {
      const action = new vscode.CodeAction(
        `⤷ ${suggestion}`,
        vscode.CodeActionKind.QuickFix,
      );
      action.command = {
        command: 'vscode-hanspell.fixTypo',
        title: 'Fix a typo',
        arguments: [
          {
            document,
            suggestion,
            token: diagnostic.token,
            range: diagnostic.range,
          },
        ],
      };

      actions.push(action);
    });

    if (actions.length) {
      actions[0].isPreferred = true;
    }

    return actions;
  }

  private createIgnoreTypoCommandCodeAction(
    token: string,
    document: vscode.TextDocument,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `사전에 추가: “${token}”`,
      vscode.CodeActionKind.QuickFix,
    );
    action.command = {
      command: 'vscode-hanspell.ignoreTypo',
      title: 'Ignore a typo',
      arguments: [
        {
          document,
          token,
        },
      ],
    };

    return action;
  }
}
