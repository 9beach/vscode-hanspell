/**
 * Defines `HanspellTypo` type and the functions for spellCheck commands, and
 * creates dictionary of `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { Minimatch } from 'minimatch';

const hanspell = require('hanspell');

import { refreshDiagnostics } from './diagnostics';

/** Dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
const docs2typos = new WeakMap();

export type HanspellTypo = {
  token: string;
  suggestions: string[];
  info: string;
  type?: string;
};

/** Gets typos of the document. */
export const getTyposOfDocument = (doc: vscode.TextDocument): HanspellTypo[] =>
  docs2typos.get(doc);

/** Spell check service type. */
enum SpellCheckService {
  pnu = 0,
  daum,
  all,
}

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
      cancellable: true,
    },
    () =>
      spellCheck(SpellCheckService.pnu).catch((err) => {
        vscode.window.showInformationMessage(err);
      }),
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
    () =>
      spellCheck(SpellCheckService.daum).catch((err) => {
        vscode.window.showInformationMessage(err);
      }),
  );
}

/**
 *  Spell checks the active document by PNU and DAUM service, and sets
 *  docs2typos map.
 *
 *  Called by 'vscode-hanspell.spellCheckByAll' command.
 */
export function spellCheckByAll(): void {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '맞춤법 검사(다음, 부산대) 중입니다.',
      cancellable: true,
    },
    () =>
      spellCheck(SpellCheckService.all).catch((err) => {
        vscode.window.showInformationMessage(err);
      }),
  );
}

/** Reads glob patterns in `.hanspell-ignore` to avoid from spell check. */
function getHanspellIgnore(): string {
  try {
    // '이딸리아*\n톨스또이\n,' => '{이딸리아*,톨스또이*,}'.
    const homedir = process.env.HOME || process.env.USERPROFILE;
    let ignores = fs.readFileSync(`${homedir}/.hanspell-ignore`, 'utf8');

    ignores = ignores.replace(/[,{}]/g, '');
    ignores = `{${ignores.replace(/[\n ][\n ]*/g, ',')}}`;
    if (ignores.length < 4) {
      ignores = '';
    }
    return ignores;
  } catch (err) {
    return '';
  }
}

/** Spell checks the active document, and sets docs2typos map. */
function spellCheck(server: SpellCheckService): Promise<string> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return new Promise((resolve, reject) => {
      return reject('먼저 검사할 문서를 선택하세요.');
    });
  }

  const doc = editor.document;
  // Due to PNU server's weird behavior.
  const text = doc
    .getText(editor.selection.isEmpty ? undefined : editor.selection)
    .replace(/  *$/g, '')
    .replace(/^  */g, '')
    .replace(/  *\n/g, '\n')
    .replace(/\n  */g, '\n')
    .replace(/\n\n*/g, '\n')
    .replace(/\n\n*$/g, '');

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let pnuFailed = false;

    function spellCheckDid(response: any[]): void {
      typos = typos.concat(response);
    }

    function spellCheckFinished(): void {
      const ignores = new Minimatch(getHanspellIgnore());
      docs2typos.set(
        doc,
        !ignores.empty
          ? uniq(typos).filter((typo) => !ignores.match(typo.token))
          : uniq(typos),
      );

      refreshDiagnostics(doc);

      if (pnuFailed) {
        reject('부산대 서비스 접속 오류로 일부 문장은 교정하지 못했습니다.');
      } else {
        resolve('맞춤법 검사를 마쳤습니다.');
      }
    }

    const HTTP_TIMEOUT = 10000;

    switch (server) {
      case SpellCheckService.pnu:
        hanspell.spellCheckByPNU(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          spellCheckFinished,
          (): void =>
            reject('부산대 서비스 접속 오류로 맞춤법 교정에 실패했습니다.'),
        );
        break;
      case SpellCheckService.daum:
        hanspell.spellCheckByDAUM(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          spellCheckFinished,
          (): void =>
            reject('다음 서비스 접속 오류로 맞춤법 교정에 실패했습니다.'),
        );
        break;
      default:
        hanspell.spellCheckByPNU(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          (): void => {
            hanspell.spellCheckByDAUM(
              text,
              HTTP_TIMEOUT,
              spellCheckDid,
              spellCheckFinished,
              (): void =>
                reject('다음 서비스 접속 오류로 맞춤법 교정에 실패했습니다.'),
            );
          },
          (): void => {
            pnuFailed = true;
          },
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
  const sorted = typos.sort((a: HanspellTypo, b: HanspellTypo): number => {
    if (a.token < b.token) {
      return -1;
    } else if (a.token > b.token) {
      return 1;
    } else {
      return 0;
    }
  });

  const left = [sorted[0]];

  for (let i = 1; i < typos.length; i++) {
    if (
      sorted[i - 1].token !== sorted[i].token &&
      sorted[i].token.indexOf(sorted[i - 1].token) == -1
    ) {
      left.push(sorted[i]);
    }
  }
  return left;
}
