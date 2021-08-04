/**
 * Defines `HanspellTypo` type and the functions for spellCheck commands, and
 * creates dictionary of `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { Minimatch, IMinimatch } from 'minimatch';

const hanspell = require('hanspell');

import { refreshDiagnostics } from './diagnostics';

/** Dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
const docs2typos = new WeakMap();

export type HanspellTypo = {
  token: string;
  suggestions: string[];
  info: string;
  type?: string;
  duplicated?: boolean; // Checks if it appears both in PNU and DAUM.
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

let ignoreLastModified = -1;
let match = new Minimatch('');

/** Reads glob patterns in `.hanspell-ignore` to avoid from spell check. */
function getHanspellIgnore(): IMinimatch {
  try {
    const path = `${
      process.env.HOME || process.env.USERPROFILE
    }/.hanspell-ignore`;
    const stat = fs.statSync(path);

    if (stat === undefined) {
      return match;
    }

    if (ignoreLastModified === stat.mtimeMs) {
      return match;
    }
    ignoreLastModified = stat.mtimeMs;

    // '이딸리아*\n톨스또이\n,' => '{이딸리아*,톨스또이*,}'.
    const ignores = `{${fs
      .readFileSync(path, 'utf8')
      .replace(/[,{}]/g, '\\$&')
      .replace(/\n\n*/g, ',')}}`;

    if (ignores.length >= 4) {
      match = new Minimatch(ignores);
    } else {
      match = new Minimatch('');
    }

    return match;
  } catch (err) {
    return match;
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
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection,
  );

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let pnuFailed = false;

    function spellCheckDid(response: HanspellTypo[]): void {
      typos = typos.concat(response);
    }

    function spellCheckFinished(): void {
      const ignores = getHanspellIgnore();
      const reduced = SpellCheckService.all === server ? uniq(typos) : typos;

      docs2typos.set(
        doc,
        !ignores.empty
          ? reduced.filter((typo) => !ignores.match(typo.token))
          : reduced,
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

/** Removes the duplicated or overlapping tokens from the typos array. */
function uniq(typos: HanspellTypo[]): HanspellTypo[] {
  if (typos.length === 0) {
    return typos;
  }

  // Sorts array by length.
  const sorted = typos.sort((a: HanspellTypo, b: HanspellTypo): number => {
    if (a.token.length < b.token.length) {
      return -1;
    } else if (a.token.length > b.token.length) {
      return 1;
    } else {
      return 0;
    }
  });

  const typosLen = sorted.length;
  const isUniq = Array(typosLen).fill(true);

  for (let i = 0; i < typosLen; i++) {
    const shortToken = sorted[i].token;

    // Escapes regular expression special characters.
    const escaped = shortToken.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Checks left-side characters.
    const left = new RegExp(`[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣].*${escaped}`, 'g');

    // Checks right-side characters.
    const right = new RegExp(`${escaped}.*[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]`, 'g');

    sorted[i].duplicated = false;

    for (let j = i + 1; j < typosLen; j++) {
      const longToken = sorted[j].token;

      // Removes same or nearly same tokens.
      //
      // If '안녕 하세요' and '안녕 하세요.' exist, then removes '안녕 하세요.'. But
      // '채마', '채마밭', '채마.밭' do not matter.
      if (
        isUniq[j] &&
        longToken.indexOf(shortToken) !== -1 &&
        !left.exec(longToken) &&
        !right.exec(longToken)
      ) {
        isUniq[j] = false;
        sorted[i].duplicated = true;
        break; // At most, once for a token.
      }
    }
  }

  const reduced = [];
  for (let i = 0; i < typosLen; i++) {
    if (isUniq[i]) {
      reduced.push(sorted[i]);
    }
  }

  return reduced;
}
