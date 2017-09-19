#!/bin/zsh

WD=$(readlink -f $(dirname "$0"))

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function win() {
  printf "\n${GREEN}$1${NC}\n"
}

function warn() {
    printf "\n${YELLOW}$1${NC}\n"
}

function error() {
    printf "\n${RED}$1${NC}\n"
}

DIFF_OUTPUT=$(git diff --stat)
CLEAN_OUTPUT=$(git clean --dry-run)

if [[ "${DIFF_OUTPUT}" != "" || "${CLEAN_OUTPUT}" != "" ]]; then
  error "Your working tree is not clean"
  exit 1
fi

pushd "${WD}/.." > /dev/null
CONFLUENCE_VERSION=$(git rev-parse HEAD)
popd > /dev/null

pushd "${WD}/../node_modules/foam2" > /dev/null
FOAM2_VERSION=$(git rev-parse HEAD)
popd > /dev/null

if [[ "${CONFLUENCE_VERSION}" = "" ]]; then
  error "Main source is not under version control. Is this not a git clone?"
  exit 1
fi
if [[ "${CONFLUENCE_VERSION}" = "" || "${CONFLUENCE_VERSION}" = "${FOAM2_VERSION}" ]]; then
  error "FOAM2 is not under version control. Did you forget to symlink /path/to/foam2 -> node_modules/foam2?"
  exit 1
fi
win "Preparing build for Confluence@${CONFLUENCE_VERSION}, FOAM2@${FOAM2_VERSION}"

if ! webpack --config "${WD}/../config/webpack.prod.js"; then
  error "webpack failed"
  exit 1
fi
win "Deploying"

gcloud config set project web-confluence
gcloud app deploy --version="confluence-${CONFLUENCE_VERSION:0:7}--foam2-${FOAM2_VERSION:0:7}"
win "App deployed! Exiting."
