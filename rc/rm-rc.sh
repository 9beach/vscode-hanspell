#!/usr/bin/env bash

REPO_PATH="$(dirname $(cd "$(dirname "$0")" > /dev/null 2>&1; pwd -P))"

cd

rm -f .hanspell-ignore .hanspell-typos .hanspell-bad-expressions.json
