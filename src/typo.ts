/**
 * Defines `HanspellTypo` type.
 */

/** Carries the information of a typo. */
export type HanspellTypo = {
  token: string; // Typo token.
  suggestions: string[]; // Fix suggestions.
  info: string; // Typo info.
  type?: string; // Only DAUM service returns `type` ('space', 'spell'...).
  common?: boolean; // Checks if the typo appears both in PNU and DAUM services.
  db?: boolean; // Checks if the typo is from `~/.hanspell-typos`.
};
