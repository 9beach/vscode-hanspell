/** Defines `HanspellHistory` class. */

import * as fs from 'fs';

/** `HanspellHistory` class providing log writing. */
export class HanspellHistory {
  constructor() {
    this.stream = fs.createWriteStream(HanspellHistory.path, {
      flags: 'a',
    });
  }

  private stream;

  write(log: string): boolean {
    return this.stream.write(log);
  }

  end(): void {
    this.stream.end();
  }

  public static writeOnce(log: string) {
    fs.writeFile(HanspellHistory.path, log, { flag: 'a' }, (_) => {});
  }

  /**
   * Stats history file size, and renames it to a backup file when it is too
   * large.
   */
  public static backupIfTooLarge(): void {
    try {
      const stat = fs.statSync(HanspellHistory.path);
      if (stat === undefined) {
        return;
      }
      if (stat.size > 10 * 1024 * 1024) {
        for (let i = 1; i < 10000; ++i) {
          const newPath = `${HanspellHistory.path}.${i}`;
          if (!fs.existsSync(newPath)) {
            fs.rename(HanspellHistory.path, newPath, (_) => {});
            return;
          }
        }
      }
    } catch (err) {}
  }

  /** File path of `.hanspell-history` */
  private static readonly path = `${
    process.env.HOME || process.env.USERPROFILE
  }/.hanspell-history`;
}
