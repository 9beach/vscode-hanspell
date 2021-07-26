import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as match from 'micromatch';

suite('SpellCheck Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('micromatch test', () => {
    assert.strictEqual(true, match.isMatch('a/a', ['a/**']));
    assert.strictEqual(true, match.isMatch('a/a', ['a*/**']));
    assert.strictEqual(false, match.isMatch('a/a', ['a*']));
  });
});
