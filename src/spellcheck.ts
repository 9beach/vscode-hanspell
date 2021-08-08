/**
 * Defines the functions for spellCheck commands, and creates dictionary of
 * `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';

const hanspell = require('hanspell');

import { refreshDiagnostics } from './diagnostics';
import { HanspellTypo } from './typo';
import { HanspellIgnore } from './ignore';
import { HanspellTypoDB } from './typo-db';

/** Dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
const docs2typos = new WeakMap();

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
 * Spell checks the active document by PNU service, and sets `docs2typos` map.
 */
export const spellCheckByPNU = () =>
  spellCheckWithProgress('맞춤법 검사 (부산대)', SpellCheckService.pnu);

/**
 * Spell checks the active document by DAUM service, and sets `docs2typos` map.
 */
export const spellCheckByDAUM = () =>
  spellCheckWithProgress('맞춤법 검사 (다음)', SpellCheckService.daum);

/**
 * Spell checks the active document by PNU and DAUM service, and sets
 * `docs2typos` map.
 */
export const spellCheckByAll = () =>
  spellCheckWithProgress('맞춤법 검사', SpellCheckService.all);

/** Calls `spellCheck` with progress bar. */
function spellCheckWithProgress(
  title: string,
  service: SpellCheckService,
): void {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: true,
    },
    () =>
      spellCheck(service).catch((err) => {
        vscode.window.showInformationMessage(err);
      }),
  );
}

/** Spell checks the active document, and sets `docs2typos` map. */
function spellCheck(service: SpellCheckService): Promise<string> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return new Promise((resolve, reject) => {
      return reject('검사할 문서가 없습니다.');
    });
  }

  const doc = editor.document;
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection,
  );

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let pnuFailed = false;

    function spellCheckDid(response: HanspellTypo[]): void {
      if (service !== SpellCheckService.pnu) {
        response.forEach((r) => {
          /** PNU service has good `typo.info`, but DAUM service does not. */
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
      typos = uniq(typos.concat(HanspellTypoDB.getTypos()), service);
      const ignore = new HanspellIgnore();

      docs2typos.set(
        doc,
        !ignore.empty()
          ? typos.filter((typo) => !ignore.match(typo.token))
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

/** Checks if two typos are from different services. */
function areFromDifferentServices(a: HanspellTypo, b: HanspellTypo) {
  // Only DAUM service has `HanspellTypo.type`.
  return (
    (a.type !== undefined && b.type === undefined) ||
    (a.type === undefined && b.type !== undefined) ||
    a.local === true ||
    b.local === true
  );
}

/** Checks if `a.token` is longer than `b.token`. */
const longerThan = (a: HanspellTypo, b: HanspellTypo): boolean =>
  a.token.length > b.token.length;

/**
 * Removes same or nearly same tokens from the typos array, and sets
 * `HanspellTypo.common` and `HanspellTypo.regex`.
 */
function uniq(
  typos: HanspellTypo[],
  service: SpellCheckService,
): HanspellTypo[] {
  if (typos.length === 0) {
    return typos;
  }

  // Checks if there are multiple instances of a typo. We don't need them.
  //
  // e.g., if `sorted.map((t) => t.token)` is ['a', 'a', 'xyz', '  a.'],
  // then `isUniq` is [true, false, true, false].
  const isUniq = Array(typos.length).fill(true);

  // Sorts typos by length.
  const sorted = typos.sort((a, b) =>
    longerThan(b, a) ? -1 : longerThan(a, b) ? 1 : 0,
  );

  // Sets `typo.common` and `isUniq[i]` for each element of sorted array.
  sorted.forEach((shortTypo, i) => {
    if (!isUniq[i]) {
      return;
    }

    // Escapes regular expression special characters, and allocates `RegExp` to
    // match word boundary later.
    const escaped = shortTypo.token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (shortTypo.regex === undefined) {
      shortTypo.regex = new RegExp(
        `(^|(?<=[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z]))${escaped}((?=[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z])|$)`,
        'g',
      );
    }

    if (service === SpellCheckService.all) {
      if (shortTypo.local === true) {
        shortTypo.common = true;
      } else {
        shortTypo.common = false;
      }
    } else {
      shortTypo.common = undefined;
    }

    // Checks if a long token (sorted[j].token) has no additional letters.
    const nearlySameToShortToken = new RegExp(
      `^[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z]*${escaped}[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z]*$`,
    );

    // Removes same or nearly same tokens.
    for (let j = i + 1; j < typos.length; j++) {
      if (isUniq[j] && nearlySameToShortToken.exec(sorted[j].token)) {
        isUniq[j] = false;
        if (
          service === SpellCheckService.all &&
          areFromDifferentServices(shortTypo, sorted[j])
        ) {
          shortTypo.common = true;
        }
      }
    }
  });

  // Filters duplicated elements.
  return sorted.filter((_, i) => isUniq[i]);
}
