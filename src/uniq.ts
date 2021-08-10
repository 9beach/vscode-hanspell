/**
 * Defines the functions for spellCheck commands, and creates dictionary of
 * `vscode.TextDocument` to `HanspellTypo[]`.
 */

import * as vscode from 'vscode';

const hanspell = require('hanspell');

import { HanspellTypo } from './typo';
import { SpellCheckService } from './spellcheck';

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
export function uniq(
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
