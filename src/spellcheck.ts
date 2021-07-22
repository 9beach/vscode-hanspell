import * as vscode from 'vscode';
import { refreshDiagnostics } from './diagnostics';

const hanspell = require('hanspell');

export const docs2typos = new WeakMap();

enum SpellCheckServer {
	pnu = 0,
	daum,
}

export function spellCheckByPNU(): void {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: '맞춤법 검사(부산대)를 진행중입니다.'
		},
		() => spellCheck(SpellCheckServer.pnu).catch(err => {
			vscode.window.showInformationMessage(err);
		})
	);
}

export function spellCheckByDAUM(): void {
	vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: '맞춤법 검사(다음)를 진행중입니다.'
		},
		() => spellCheck(SpellCheckServer.daum).catch(err => {
			vscode.window.showInformationMessage(err);
		})
	);
}

/**
 * Spell checks the active document, and makes docs2typos map.
 */
function spellCheck(server: SpellCheckServer): Promise<string> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return new Promise((resolve, reject) => {
			return reject("먼저 검사할 문서를 선택하세요.");
		});
	};

	const doc = editor.document;
	const text = doc.getText(
		editor.selection.isEmpty ? undefined : editor.selection
	);

	// vscode.window.showInformationMessage("맞춤법 검사를 시작합니다.",);

	let typos: any[] = [];

	function spellCheckGot(response: any[]): void {
		typos = typos.concat(response);
		console.log(response);
	}

	return new Promise((resolve, reject) => {
		function spellCheckFinished(): void {
			docs2typos.set(doc, uniq(typos));
			refreshDiagnostics(doc);
			resolve("맞춤법 검사를 마쳤습니다.",);
		}

		switch (server) {
			case SpellCheckServer.pnu:
				hanspell.spellCheckByPNU(
					text,
					10000,
					spellCheckGot,
					spellCheckFinished,
					(): void => reject("부산대 서버의 접속 오류로 일부 문장 교정에 실패했습니다.")
				);
				break;
			default:
				hanspell.spellCheckByDAUM(
					text,
					10000,
					spellCheckGot,
					spellCheckFinished,
					(): void => reject("다음 서버의 접속 오류로 일부 문장 교정에 실패했습니다.")
				);
				break;
		}
	});
}

function uniq(arr: any): any[] {
  if (arr.length === 0) {
		return arr;
	}
  arr = arr.sort((a: any, b: any): number => {
		if (a.token < b.token) {
		  return -1;
		} else if (a.token > b.token) {
			return 1;
		} else {
		  return 0;
		}
	});
	
  let ret = [arr[0]];
	
  for (let i = 1; i < arr.length; i++) {
		if (arr[i-1].token !== arr[i].token) {
      ret.push(arr[i]);
    }
  }
  return ret;
}