/** Defines `DocumentsToTypos` class and `spellCheck()` function. */

import * as vscode from 'vscode';

const hanspell = require('hanspell');

import { HanspellTypo } from './typo';
import { SpellCheckService } from './service';
import { uniq } from './uniq';
import { HanspellIgnore } from './ignore';
import { HanspellTypoDB } from './typo-db';
import { HanspellBadExpressions } from './bad-expressions';

/** Class for dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
export class DocumentsToTypos {
  /** Dictionary of `vscode.TextDocument` to `HanspellTypo[]`. */
  private static docs2typos = new WeakMap();

  /** Gets typos of the document. */
  static getTypos = (doc: vscode.TextDocument) =>
    DocumentsToTypos.docs2typos.get(doc);

  /** Sets typos of the document. */
  static setTypos = (doc: vscode.TextDocument, typos: HanspellTypo[]) =>
    DocumentsToTypos.docs2typos.set(doc, typos);
}

/**
 * Spell checks given document, makes `HanspellTypo[]`, and sets them to
 * `DocumentsToTypos`.
 */
export function spellCheck(
  editor: vscode.TextEditor,
  service: SpellCheckService,
): Promise<string> {
  const doc = editor.document;
  const text = doc.getText(
    editor.selection.isEmpty ? undefined : editor.selection,
  );

  return new Promise((resolve, reject) => {
    let typos: HanspellTypo[] = [];
    let naverFailed = false;

    function spellCheckDid(response: HanspellTypo[]): void {
      if (service !== SpellCheckService.naver) {
        response.forEach((typo) => {
          /** NAVER service has good `typo.info`, but DAUM service does not. */
          if (typo.info) {
            return;
          } else if (typo.type === 'space') {
            typo.info = '띄어쓰기 오류';
          } else if (typo.type === 'doubt') {
            typo.info = '오류 의심';
          } else if (typo.type === 'space_spell') {
            typo.info = '맞춤법/띄어쓰기 오류';
          } else if (typo.type === 'spell') {
            typo.info = '맞춤법 오류';
          } else {
            typo.info = '맞춤법 오류';
            console.log(`새로운 오류 타입 발견: ${typo.type}`);
          }
        });
      }
      typos = typos.concat(response);
    }

    function spellCheckFinished(): void {
      const ignore = new HanspellIgnore();

      typos = ignore.empty()
        ? typos
        : typos.filter((typo) => !ignore.match(typo.token));
      typos = HanspellBadExpressions.getTypos().concat(
        uniq(HanspellTypoDB.getTypos().concat(typos), service),
      );

      DocumentsToTypos.setTypos(doc, typos);

      if (naverFailed) {
        reject('네이버 서비스 접속 오류로 일부 문장은 교정하지 못했습니다.');
      } else {
        resolve('맞춤법 검사를 마쳤습니다.');
      }
    }

    const HTTP_TIMEOUT = 20000;

    switch (service) {
      case SpellCheckService.naver:
        hanspell.spellCheckByNAVER(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          spellCheckFinished,
          (): void => {
            naverFailed = true;
          },
        );
        break;
      case SpellCheckService.daum:
        hanspell.spellCheckByDAUM(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          spellCheckFinished,
          (): void =>
            reject('다음 서비스 접속 오류로 맞춤법 교정에 실패했습니다.'),
        );
        break;
      default:
        hanspell.spellCheckByNAVER(
          text,
          HTTP_TIMEOUT,
          spellCheckDid,
          (): void => {
            hanspell.spellCheckByDAUM(
              text,
              HTTP_TIMEOUT,
              spellCheckDid,
              spellCheckFinished,
              (): void =>
                reject('다음 서비스 접속 오류로 맞춤법 교정에 실패했습니다.'),
            );
          },
          (): void => {
            naverFailed = true;
          },
        );
        break;
    }
  });
}
