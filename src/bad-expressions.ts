/** Defines `HanspellBadExpressions` class for offline typo fixing. */

import * as vscode from 'vscode';
import * as fs from 'fs';

import { HanspellTypo } from './typo';

/** Carries the information of a bad expression. */
type BadExpression = {
  // RegExp of token.
  expression: string;
  // Suggestions for fixing typo.
  suggestions?: string[];
  // Typo info.
  info?: string;
  severity?: string;
};

function toDiagnosticSeverity(severity: string | undefined) {
  switch (severity) {
    case 'Information':
      return vscode.DiagnosticSeverity.Information;
    case 'Warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'Error':
      return vscode.DiagnosticSeverity.Error;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

/** Carries user defined typos from `~/.hanspell-bad-expressions.json`. */
export class HanspellBadExpressions {
  /** Reads typos in `.hanspell-bad-expressions.json`. */
  static getTypos(): HanspellTypo[] {
    try {
      const stat = fs.statSync(HanspellBadExpressions.path);

      if (stat === undefined) {
        HanspellBadExpressions.typos = [];
        return HanspellBadExpressions.typos;
      }

      if (HanspellBadExpressions.lastModified === stat.mtimeMs) {
        return HanspellBadExpressions.typos;
      }
      HanspellBadExpressions.lastModified = stat.mtimeMs;

      HanspellBadExpressions.typos = JSON.parse(
        fs.readFileSync(HanspellBadExpressions.path, 'utf8'),
      )['bad-expressions'].map((bad: BadExpression) => {
        return {
          token: '',
          suggestions: bad.suggestions ? bad.suggestions : [],
          severity: toDiagnosticSeverity(bad.severity),
          regex: new RegExp(bad.expression, 'g'),
          info: bad.info ? bad.info : '사용자 정의 표현식',
          isExpression: true,
        };
      });
    } catch (err) {
      console.log(err.message);

      HanspellBadExpressions.typos = [];
    }
    return HanspellBadExpressions.typos;
  }

  /** File path of `.hanspell-bad-expressions.json` */
  private static readonly path = `${
    process.env.HOME || process.env.USERPROFILE
  }/.hanspell-bad-expressions.json`;

  /** HanspellTypo array in `.hanspell-bad-expressions.json`. */
  private static typos: HanspellTypo[] = [];

  /** Last modified time of `.hanspell-bad-expressions.json` */
  private static lastModified = -1;
}
