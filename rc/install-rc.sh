#!/usr/bin/env bash

REPO_PATH="$(dirname $(cd "$(dirname "$0")" > /dev/null 2>&1; pwd -P))"

$REPO_PATH/rc/rm-rc.sh

cd

ln -s $REPO_PATH/rc/hanspell-ignore .hanspell-ignore
ln -s $REPO_PATH/rc/hanspell-typos .hanspell-typos
ln -s $REPO_PATH/rc/hanspell-bad-expressions.json .hanspell-bad-expressions.json
