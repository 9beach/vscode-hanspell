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
  // DiagnosticSeverity.
  severity?: string;
};

function toDiagnosticSeverity(severity: string | undefined) {
  if (severity === undefined) {
    return vscode.DiagnosticSeverity.Information;
  }

  switch (severity.toLowerCase()) {
    case 'information':
      return vscode.DiagnosticSeverity.Information;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'hint':
      return vscode.DiagnosticSeverity.Hint;
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
        if (bad.expression === undefined) {
          throw new Error('No "expression" in JSON');
        }
        return {
          token: '',
          suggestions: bad.suggestions ? bad.suggestions : [],
          severity: toDiagnosticSeverity(bad.severity),
          regex: new RegExp(bad.expression, 'g'),
          info: bad.info ? bad.info : '사용자 정의 표현식',
        };
      });
    } catch (err) {
      // If JSON error.
      if (err.message.indexOf('ENOENT') !== 0) {
        vscode.window.showInformationMessage(
          `~/.hanspell-bad-expressions.json 오류: ${err.message}`,
        );
      }

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
