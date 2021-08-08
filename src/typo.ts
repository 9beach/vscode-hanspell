/**
 * Defines `HanspellTypo` type.
 */

/** Carries the information of a typo. */
export type HanspellTypo = {
  // Typo token.
  token: string;
  // Suggestions for fixing typo.
  suggestions: string[];
  // Typo info.
  info: string;
  // RegExp of token.
  regex?: RegExp;
  // Only DAUM service returns `type` ('space', 'spell'...).
  type?: string;
  // Checks if the typo appears both in PNU and DAUM services.
  common?: boolean;
  // Checks if the typo is from `~/.hanspell-typos`.
  local?: boolean;
};
