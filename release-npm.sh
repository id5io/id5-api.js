#!/usr/bin/env bash

function publishIfNeeded(){
  PACKAGE="package.json"
  NAME=$(jq -r ".name" "${PACKAGE}")
  VERSION=$(jq -r ".version" "${PACKAGE}")
  if npm view "${NAME}" --json | jq -r '.versions[]'  | grep "^${VERSION}$" ; then
    echo "${NAME} v: ${VERSION} has already been published."
  else
    if ! (npm publish --access public); then
      echo "Failed to publish ${NAME} v: ${VERSION}" >&2
      exit 1
    fi
  fi
}

DIRS=("packages/diagnostics" "packages/multiplexing" ".")
for dir in "${DIRS[@]}"; do
  cd "${dir}" || exit 1
  publishIfNeeded "${dir}"
  cd "${OLDPWD}" || exit 1
done




