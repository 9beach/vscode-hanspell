import * as vscode from 'vscode';
import * as minimatch from 'minimatch';
import * as fs from 'fs';

const hanspell = require('hanspell');

import { refreshDiagnostics } from './diagnostics';

/**
 * Dictionary for `vscode.TextDocument` to typos array.
 */
export const docs2typos = new WeakMap();

/**
 * Spell check service types.
 */
enum SpellCheckService {
  pnu = 0,
  daum,
}

/**
 * Spell checks the active document by PNU service, and sets docs2typos map.
 */
export function spellCheckByPNU(): void {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '맞춤법 검사(부산대) 중입니다.',
      cancellable: true
    },
    () => spellCheck(SpellCheckService.pnu).catch(err => {
      vscode.window.showInformationMessage(err);
    })
  );
}

/**
 * Spell checks the active document by DAUM service, and sets docs2typos map.
 */
 export function spellCheckByDAUM(): void {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '맞춤법 검사(다음) 중입니다.',
      cancellable: true,
    },
    () => spellCheck(SpellCheckService.daum).catch(err => {
      vscode.window.showInformationMessage(err);
    })
  );
}

/**
 * $HOME path for Microsoft Windows, MacOS, and Linux.
 */
const homedir: string | undefined = process.env.HOME || process.env.USERPROFILE;

/**
 * Spell checks the active document, and sets docs2typos map.
 */
function spellCheck(server: SpellCheckService): Promise<string> {
  let ignores: string = '';

  try {
    ignores = fs.readFileSync(`${homedir}/.hanspell-ignore`, 'utf8');
    ignores = ignores.replace(/[,{}]/g, '');
    ignores = `{${ignores.replace(/[\n ][\n ]*/g, ',')}}`;
    if (ignores.length < 4) {
      ignores = '';
    }
  } catch (err) {
  }
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return new Promise((resolve, reject) => {
      return reject("먼저 검사할 문서를 선택하세요.");
    });
  };

  const doc = editor.document;
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection
  );

  let typos: any[] = [];

  function spellCheckGot(response: any[]): void {
    typos = typos.concat(response);
  }

  return new Promise((resolve, reject) => {
    function spellCheckFinished(): void {
      docs2typos.set(
        doc,
        ignores
          ? uniq(typos).filter(typo => !minimatch(typo.token, ignores))
          : uniq(typos)
      );
      refreshDiagnostics(doc);
      resolve("맞춤법 검사를 마쳤습니다.");
    }

    switch (server) {
      case SpellCheckService.pnu:
        hanspell.spellCheckByPNU(
          text,
          10000,
          spellCheckGot,
          spellCheckFinished,
          (): void => reject("부산대 서비스 접속 오류로 맞춤법 교정에 실패했습니다.")
        );
        break;
      default:
        hanspell.spellCheckByDAUM(
          text,
          10000,
          spellCheckGot,
          spellCheckFinished,
          (): void => reject("다음 서비스 접속 오류로 맞춤법 교정에 실패했습니다.")
        );
        break;
    }
  });
}

/**
 * Removes the duplicated tokens from the typos array.
 */
function uniq(typos: any): any[] {
  if (typos.length === 0) {
    return typos;
  }
  let sorted = typos.sort((a: any, b: any): number => {
    if (a.token < b.token) {
      return -1;
    } else if (a.token > b.token) {
      return 1;
    } else {
      return 0;
    }
  });
  
  let left = [sorted[0]];
  
  for (let i = 1; i < typos.length; i++) {
    if (sorted[i-1].token !== sorted[i].token) {
      left.push(sorted[i]);
    }
  }
  return left;
}