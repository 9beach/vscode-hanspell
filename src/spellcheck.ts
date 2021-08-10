/**
 * Defines the functions for spellCheck commands, and creates dictionary of
 * `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';

const hanspell = require('hanspell');

import { HanspellTypo } from './typo';
import { HanspellIgnore } from './ignore';
import { HanspellTypoDB } from './typo-db';

/** Class for dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
export class DocumentsToTypos {
  /** Dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
  private static docs2typos = new WeakMap();

  /** Gets typos of the document. */
  static getTypos = (doc: vscode.TextDocument) =>
    DocumentsToTypos.docs2typos.get(doc);

  /** Sets typos of the document. */
  static setTypos = (doc: vscode.TextDocument, typos: HanspellTypo[]) =>
    DocumentsToTypos.docs2typos.set(doc, typos);
}

/** Spell check service type. */
export enum SpellCheckService {
  pnu = 0,
  daum,
  all,
}

/** Spell checks the given document, and calls `DocumentsToTypos.setTypos`. */
export function spellCheck(
  editor: vscode.TextEditor,
  service: SpellCheckService,
): Promise<string> {
  const doc = editor.document;
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection,
  );

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let pnuFailed = false;

    function spellCheckDid(response: HanspellTypo[]): void {
      if (service !== SpellCheckService.pnu) {
        response.forEach((typo) => {
          /** PNU service has good `typo.info`, but DAUM service does not. */
          if (typo.info) {
            return;
          } else if (typo.type === 'space') {
            typo.info = '띄어쓰기 오류';
          } else if (typo.type === 'doubt') {
            typo.info = '오류 의심';
          } else if (typo.type === 'space_spell') {
            typo.info = '맞춤법/띄어쓰기 오류';
          } else if (typo.type === 'spell') {
            typo.info = '맞춤법 오류';
          } else {
            typo.info = '맞춤법 오류';
            console.log(`새로운 오류 타입 발견: ${typo.type}`);
          }
        });
      }
      typos = typos.concat(response);
    }

    function spellCheckFinished(): void {
      const ignore = new HanspellIgnore();

      typos = uniq(typos.concat(HanspellTypoDB.getTypos()), service);
      typos = ignore.empty()
        ? typos
        : typos.filter((typo) => !ignore.match(typo.token));

      DocumentsToTypos.setTypos(doc, typos);

      if (pnuFailed) {
        reject('부산대 서비스 접속 오류로 일부 문장은 교정하지 못했습니다.');
      } else {
        resolve('맞춤법 검사를 마쳤습니다.');
      }
    }

    const HTTP_TIMEOUT = 20000;

    switch (service) {
      case SpellCheckService.pnu:
        hanspell.spellCheckByPNU(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          spellCheckFinished,
          (): void => {
            pnuFailed = true;
          },
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
    // match word boundary later in `refreshDiagnostics()` or somewhere.
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
