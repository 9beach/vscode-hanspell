/**
 * Defines `HanspellTypoDB` class for offline typo fixing.
 */

import * as fs from 'fs';

import { HanspellTypo } from './typo';

/** Carries user defined typos from `~/.hanspell-typos`. */
export class HanspellTypoDB {
  /** Reads typos in `.hanspell-typos`. */
  static getTypos(): HanspellTypo[] {
    try {
      const stat = fs.statSync(HanspellTypoDB.path);

      if (stat === undefined) {
        HanspellTypoDB.typos = [];
        return HanspellTypoDB.typos;
      }

      if (HanspellTypoDB.lastModified === stat.mtimeMs) {
        return HanspellTypoDB.typos;
      }
      HanspellTypoDB.lastModified = stat.mtimeMs;

      HanspellTypoDB.typos = fs
        .readFileSync(HanspellTypoDB.path, 'utf8')
        .split('\n')
        .map((line) => line.split(' -> '))
        .filter((lr) => lr.length == 2 && lr[0] && lr[1])
        .map((lr) => {
          return {
            token: lr[0],
            suggestions: [lr[1]],
            info: '사용자 맞춤법 데이터베이스 (~/.hanspell-typos)',
            local: true,
          };
        });
    } catch (err) {
      console.log(err.message);

      HanspellTypoDB.typos = [];
    }
    return HanspellTypoDB.typos;
  }

  /** File path of `.hanspell-typos` */
  private static readonly path = `${
    process.env.HOME || process.env.USERPROFILE
  }/.hanspell-typos`;

  /** HanspellTypo array in `.hanspell-typos`. */
  private static typos: HanspellTypo[] = [];

  /** Last modified time of `.hanspell-typos` */
  private static lastModified = -1;
}
