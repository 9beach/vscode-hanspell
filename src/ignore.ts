/** Defines `HanspellIgnore` class. */

import * as fs from 'fs';
import { Minimatch } from 'minimatch';

/**
 * `HanspellIgnore` class having glob patterns to match typo tokens. If a token
 * is matched to a glob pattern, it's ignored.
 */
export class HanspellIgnore {
  constructor() {
    this.myMatches = HanspellIgnore.get();
  }

  /** Checks if token matches content of `.hanspell-ignore` */
  match = (token: string) =>
    this.myMatches.match(token) || !token.match(HanspellIgnore.hangul);

  /** Checks if valid content of `.hanspell-ignore` is empty */
  empty = () => this.myMatches.empty;

  /** Used to check if at least one hangul character exists. */
  private static readonly hangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

  /** File path of `.hanspell-ignore` */
  private static readonly path = `${
    process.env.HOME || process.env.USERPROFILE
  }/.hanspell-ignore`;

  /** Glob patterns in `.hanspell-ignore`. */
  private static readonly emptyMatches = new Minimatch('');
  private static matches = HanspellIgnore.emptyMatches;

  /** Last modified time of `.hanspell-ignore` */
  private static lastModified = -1;

  /** Latest glob patterns. */
  private myMatches;

  /** Adds a glob pattern to the end of file */
  static append = (pattern: string): void => {
    fs.writeFileSync(
      HanspellIgnore.path,
      HanspellIgnore.needLN() ? `\n${pattern}\n` : `${pattern}\n`,
      { flag: 'a' },
    );
  };

  private static needLN() {
    const matches = HanspellIgnore.get();

    if (
      matches.empty ||
      matches.pattern.lastIndexOf(',}') === matches.pattern.length - 2
    ) {
      return false;
    }
    return true;
  }

  /** Reads glob patterns in `.hanspell-ignore`. */
  private static get() {
    try {
      const stat = fs.statSync(HanspellIgnore.path);

      if (stat === undefined) {
        HanspellIgnore.matches = HanspellIgnore.emptyMatches;
        return HanspellIgnore.matches;
      }

      if (HanspellIgnore.lastModified === stat.mtimeMs) {
        return HanspellIgnore.matches;
      }

      HanspellIgnore.lastModified = stat.mtimeMs;

      // '이딸리아*\n톨스또이\n' => '{이딸리아*,톨스또이*,}'.
      const ignores = `{${fs
        .readFileSync(HanspellIgnore.path, 'utf8')
        .replace(/[,{}]/g, '\\$&')
        .replace(/\n\n*/g, ',')}}`;

      if (ignores.length >= 3) {
        HanspellIgnore.matches = new Minimatch(ignores);
      } else {
        HanspellIgnore.matches = HanspellIgnore.emptyMatches;
      }
    } catch (err) {
      console.log(err.message);

      HanspellIgnore.matches = HanspellIgnore.emptyMatches;
    }
    return HanspellIgnore.matches;
  }
}
