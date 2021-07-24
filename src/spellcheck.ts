/**
 * Defines `HanspellTypo` type and the functions for spellCheck commands, and
 * creates dictionary for `vscode.TextDocument` to `HanspellTypo` array.
 */

import * as vscode from 'vscode';
import * as minimatch from 'minimatch';
import * as fs from 'fs';

import { refreshDiagnostics } from './diagnostics';

const hanspell = require('hanspell');

/** Dictionary for `vscode.TextDocument` to `HanspellTypo` array. */
const docs2typos = new WeakMap();

export type HanspellTypo = {
  token: string,
  suggestions: string[];
  info: string,
  type: string
};

/** Gets typos of the document. */
export const getTyposOfDocument =
  (doc: vscode.TextDocument): HanspellTypo[] => docs2typos.get(doc);

/** Spell check service type. */
enum SpellCheckService { pnu = 0, daum }

/**
 *  Spell checks the active document by PNU service, and sets docs2typos map.
 * 
 *  Called by 'vscode-hanspell.spellCheckByPNU' command.
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
 * 
 * Called by 'vscode-hanspell.spellCheckByDAUM' command.
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

/** Adds glob patterns in `.hanspell-ignore` to avoid from spell check. */
const getHanspellIgnore = (): string => {
  const homedir = process.env.HOME || process.env.USERPROFILE;
  let ignores: string = '';

  try {
    // Before: '이딸리아*\n톨스또이\n,'
    // After: '{이딸리아*,톨스또이*,}'
    ignores = fs.readFileSync(`${homedir}/.hanspell-ignore`, 'utf8');
    ignores = ignores.replace(/[,{}]/g, '');
    ignores = `{${ignores.replace(/[\n ][\n ]*/g, ',')}}`;
    if (ignores.length < 4) {
      ignores = '';
    }
  } catch (err) {
    return '';
  }

  return ignores;
};

/** Spell checks the active document, and sets docs2typos map. */
function spellCheck(server: SpellCheckService): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return new Promise((resolve, reject) => {
      return reject("먼저 검사할 문서를 선택하세요.");
    });
  };

  const ignores = getHanspellIgnore();

  const doc = editor.document;
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection
  );

  let typos: HanspellTypo[] = [];

  function spellCheckGot(response: HanspellTypo[]): void {
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

/** Removes the duplicated tokens from the typos array. */
function uniq(typos: HanspellTypo[]): HanspellTypo[] {
  if (typos.length === 0) {
    return typos;
  }
  let sorted = typos.sort((a: HanspellTypo, b: HanspellTypo): number => {
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