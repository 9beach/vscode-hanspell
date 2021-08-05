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
  common?: boolean; // Checks if it appears both in PNU and DAUM.
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

/** Glob patterns in `.hanspell-ignore` for avoiding from spell check. */
let ignoreMatches = new Minimatch('');

/** Last modified time of `.hanspell-ignore` */
let ignoreLastModified = -1;

/** File path of `.hanspell-ignore` */
const ignorePath = `${
  process.env.HOME || process.env.USERPROFILE
}/.hanspell-ignore`;

/** Reads glob patterns in `.hanspell-ignore` to avoid from spell check. */
function getIgnoreMatches(): IMinimatch {
  try {
    const stat = fs.statSync(ignorePath);

    if (stat === undefined) {
      return ignoreMatches;
    }

    if (ignoreLastModified === stat.mtimeMs) {
      return ignoreMatches;
    }
    ignoreLastModified = stat.mtimeMs;

    // '이딸리아*\n톨스또이\n,' => '{이딸리아*,톨스또이*,}'.
    const ignores = `{${fs
      .readFileSync(ignorePath, 'utf8')
      .replace(/[,{}]/g, '\\$&')
      .replace(/\n\n*/g, ',')}}`;

    if (ignores.length >= 4) {
      ignoreMatches = new Minimatch(ignores);
    } else {
      ignoreMatches = new Minimatch('');
    }

    return ignoreMatches;
  } catch (err) {
    return ignoreMatches;
  }
}

/** Spell checks the active document, and sets docs2typos map. */
function spellCheck(service: SpellCheckService): Promise<string> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return new Promise((resolve, reject) => {
      return reject('먼저 검사할 문서를 선택하세요.');
    });
  }

  const doc = editor.document;

  // Due to PNU service's weird behavior.
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection,
  );

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let pnuFailed = false;

    function spellCheckDid(response: HanspellTypo[]): void {
      if (service !== SpellCheckService.pnu) {
        response.forEach((r) => {
          /** PNU service has good typo.info, but DAUM service does not. */
          if (r.info) {
            return;
          } else if (r.type === 'space') {
            r.info = '띄어쓰기 오류';
          } else {
            r.info = '맞춤법 오류';
          }
        });
      }
      typos = typos.concat(response);
    }

    function spellCheckFinished(): void {
      const ignores = getIgnoreMatches();
      typos = uniq(typos, service);

      docs2typos.set(
        doc,
        !ignores.empty
          ? typos.filter((typo) => !ignores.match(typo.token))
          : typos,
      );

      refreshDiagnostics(doc);

      if (pnuFailed) {
        reject('부산대 서비스 접속 오류로 일부 문장은 교정하지 못했습니다.');
      } else {
        resolve('맞춤법 검사를 마쳤습니다.');
      }
    }

    const HTTP_TIMEOUT = 10000;

    switch (service) {
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

/** Only DAUM service sets type. */
function isFromDifferentService(a: HanspellTypo, b: HanspellTypo) {
  return (
    (a.type !== undefined && b.type === undefined) ||
    (a.type === undefined && b.type !== undefined)
  );
}

/** Removes same or nearly same tokens from the typos array. */
function uniq(
  typos: HanspellTypo[],
  service: SpellCheckService,
): HanspellTypo[] {
  if (typos.length === 0) {
    return typos;
  }

  const typosLen = typos.length;
  const isUniq = Array(typosLen).fill(true);

  // Sorts typos by length.
  const sorted = typos.sort((a: HanspellTypo, b: HanspellTypo): number =>
    a.token.length < b.token.length
      ? -1
      : a.token.length > b.token.length
      ? 1
      : 0,
  );

  // Sets typo.common and isUniq[i] for each element of sorted array.
  sorted.forEach((shortTypo, i) => {
    if (!isUniq[i]) {
      return;
    }

    if (service === SpellCheckService.all) {
      shortTypo.common = false;
    }

    // Escapes regular expression special characters.
    const escaped = shortTypo.token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Checks if longToken has no additional character.
    const shortRegExp = new RegExp(
      `^[^ㄱ-ㅎㅏ-ㅣ가-힣]*${escaped}[^ㄱ-ㅎㅏ-ㅣ가-힣]*$`,
    );

    // Removes same or nearly same tokens.
    for (let j = i + 1; j < typosLen; j++) {
      if (isUniq[j] && shortRegExp.exec(sorted[j].token)) {
        isUniq[j] = false;
        if (
          service === SpellCheckService.all &&
          isFromDifferentService(shortTypo, sorted[j])
        ) {
          shortTypo.common = true;
        }
      }
    }
  });

  // Filters uniq elements.
  return sorted.filter((_, i) => isUniq[i]);
}
