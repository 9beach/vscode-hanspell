/**
 * Defines `HanspellIgnore` class which matches tokens with glob patterns in
 * `.hanspell-ignore` for avoiding from spell check.
 */

import * as fs from 'fs';
import { Minimatch } from 'minimatch';

/**
 * Defines HanspellIgnore class.
 */
export class HanspellIgnore {
  /** File path of `.hanspell-ignore` */
  static path = `${
    process.env.HOME || process.env.USERPROFILE
  }/.hanspell-ignore`;

  /** Glob patterns in `.hanspell-ignore` for avoiding from spell check. */
  static matches = new Minimatch('');

  /** Last modified time of `.hanspell-ignore` */
  static lastModified = -1;

  /** Reads glob patterns in `.hanspell-ignore`. */
  static reload(): void {
    try {
      const stat = fs.statSync(HanspellIgnore.path);

      if (stat === undefined) {
        HanspellIgnore.matches = new Minimatch('');
        return;
      }

      if (HanspellIgnore.lastModified === stat.mtimeMs) {
        return;
      }

      HanspellIgnore.lastModified = stat.mtimeMs;

      // '이딸리아*\n톨스또이\n,' => '{이딸리아*,톨스또이*,}'.
      const ignores = `{${fs
        .readFileSync(HanspellIgnore.path, 'utf8')
        .replace(/[,{}]/g, '\\$&')
        .replace(/\n\n*/g, ',')}}`;

      if (ignores.length >= 4) {
        HanspellIgnore.matches = new Minimatch(ignores);
      } else {
        HanspellIgnore.matches = new Minimatch('');
      }
    } catch (err) {
      console.log(err);
    }
  }

  constructor() {
    HanspellIgnore.reload();
  }

  /** Checks if token matches content of `.hanspell-ignore` */
  match = (token: string) => HanspellIgnore.matches.match(token);

  /** Checks if valid content of `.hanspell-ignore` is empty */
  empty = () => HanspellIgnore.matches.empty;
}
