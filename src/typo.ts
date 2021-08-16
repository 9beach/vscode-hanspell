/** Defines `HanspellTypo` type. */

import * as vscode from 'vscode';

/** Carries the information of a typo. */
export type HanspellTypo = {
  // Typo token.
  token: string;
  // Suggestions for fixing typo.
  suggestions: string[];
  // Typo info.
  info: string;
  // Only DAUM service returns `type` ('space', 'spell'...).
  type?: string;
  // RegExp of token.
  regex?: RegExp;
  // Diagnostic severity from `~/.hanspell-bad-expressions.json`.
  severity?: vscode.DiagnosticSeverity;
  // Checks if the typo appears both in PNU and DAUM services.
  isCommon?: boolean;
  // Checks if the typo is from `~/.hanspell-typos`.
  isLocal?: boolean;
  // Checks if the typo is from `~/.hanspell-bad-expressions.json`.
  isExpression?: boolean;
};
