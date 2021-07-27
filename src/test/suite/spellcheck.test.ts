import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as match from 'minimatch';

suite('SpellCheck Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('minimatch test', () => {
    assert.strictEqual(true, match('a/a', 'a/**'));
    assert.strictEqual(true, match('a/a', '{a/**,}'));

    assert.strictEqual(true, match('a', '{a,}'));
    assert.strictEqual(true, match('a/', '{a/**,}'));

    assert.strictEqual(true, match('a/a', 'a*/**'));
    assert.strictEqual(false, match('a/a', 'a*'));

    assert.strictEqual(
      true,
      match('[a.a/', '*[[!.a-zA-Z0-9:<>]*[[!.a-zA-Z0-9:<>]*'),
    );
    assert.strictEqual(
      true,
      match('[a.a/a/b/c', '*[[!.a-zA-Z0-9:<>]*[[!.a-zA-Z0-9:<>]*/**'),
    );
    assert.strictEqual(
      true,
      match('[a.a', '*[[!.a-zA-Z0-9:<>]*[[!.a-zA-Z0-9:<>]*'),
    );
  });
});
