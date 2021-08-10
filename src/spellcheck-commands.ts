/**
 * Defines the functions for spellCheck commands, and creates dictionary of
 * `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';

import { refreshDiagnostics } from './diagnostics';
import { SpellCheckService, spellCheck } from './spellcheck';

/** Spell checks the active document by PNU service. */
export const spellCheckByPNU = () =>
  spellCheckWithProgress('맞춤법 검사 (부산대)', SpellCheckService.pnu);

/** Spell checks the active document by DAUM service. */
export const spellCheckByDAUM = () =>
  spellCheckWithProgress('맞춤법 검사 (다음)', SpellCheckService.daum);

/** Spell checks the active document by PNU and DAUM service. */
export const spellCheckByAll = () =>
  spellCheckWithProgress('맞춤법 검사', SpellCheckService.all);

/** Calls `spellCheck` with progress bar. */
function spellCheckWithProgress(
  title: string,
  service: SpellCheckService,
): void {
  const editor = vscode.window.activeTextEditor;

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: editor ? title : '맞춤법을 검사할 문서가 없습니다.',
      cancellable: true,
    },
    async () => {
      if (editor) {
        try {
          await spellCheck(editor, service);
        } catch (err) {
          vscode.window.showInformationMessage(err);
        }
        refreshDiagnostics(editor.document);
      }
    },
  );
}
