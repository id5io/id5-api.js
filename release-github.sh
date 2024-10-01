#!/usr/bin/env bash

RELEASE_TAG=$1

SUCCESS=0
FAIL=1

function fail() {
  echo "$1" >&2
  exit $FAIL
}

if [ "${RELEASE_TAG}" == "" ]; then
  echo "RELEASE_TAG is not set" >&2
  exit $FAIL
fi

function isTagPresent() {
  TAG=$1
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/id5io/id5-api.js/git/ref/tags/${TAG}")
  test "$HTTP_CODE" == "200"
  return $?
}

function addAssets() {
  RELEASE_ID=$1
  ASSETS_PATH=$2
  for ASSET in $ASSETS_PATH; do
    NAME=$(basename "${ASSET}")
    RESPONSE_OUTPUT=/tmp/github-release-${TAG}-asset-${NAME}.json
    HTTP_CODE=$(curl -L -s -o "${RESPONSE_OUTPUT}" -w "%{http_code}" \
      -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer  ${GITHUB_TOKEN}" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      -H "Content-Type: application/octet-stream" \
      "https://uploads.github.com/repos/id5io/id5-api.js/releases/${RELEASE_ID}/assets?name=${NAME}" \
      --data-binary "@${ASSET}")
    if ! test "$HTTP_CODE" == "201"; then
      fail "Couldn't add asset ${NAME} to release ${RELEASE_ID}. Response code=${HTTP_CODE}, body=${RESPONSE_OUTPUT}"
    fi
    echo "Added asset ${ASSET} as ${NAME} to release ${RELEASE_ID}"
  done
}

function createRelease() {
  TAG=$1
  DESCRIPTION=$(cat "./release_notes/${TAG}.md")
  RELEASE_OUTPUT=/tmp/github-create-release-${TAG}.json

  REQUEST=$(echo '{}' | jq ".tag_name = \"${TAG}\" | .name = \"${TAG}\" | .body = \"${DESCRIPTION}\" | .draft = true")
  HTTP_CODE=$(curl -L -s -o "${RELEASE_OUTPUT}" -w "%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/id5io/id5-api.js/releases" \
    -d "$REQUEST")
  if test "$HTTP_CODE" == "201"; then
    CREATED_RELEASE_ID=$(cat "${RELEASE_OUTPUT}" | jq -r '.id')
    echo "Release created id=${CREATED_RELEASE_ID}"
    return $SUCCESS
  else
    fail "Failed to create release http_code=${HTTP_CODE} ${RELEASE_OUTPUT}"
  fi
}

function publishRelease() {
  RELEASE_ID=$1
  [[ "${RELEASE_TAG}" =~  ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] && MAKE_LATEST=true || MAKE_LATEST=false # for test purposes do not make release latest
  REQUEST=$(echo '{}' | jq ".draft = false | .make_latest = ${MAKE_LATEST}")
  RESPONSE=/tmp/github-publish-release-${TAG}.json
  HTTP_CODE=$(curl -L -s -o "$RESPONSE" -w "%{http_code}" \
    -X PATCH \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/id5io/id5-api.js/releases/${RELEASE_ID}" \
    -d "${REQUEST}")
  if test "${HTTP_CODE}" == "200"; then
    echo "Published release id=${RELEASE_ID}"
    return $SUCCESS
  else
    fail "Failed to create publish http_code=${HTTP_CODE} ${RESPONSE}"
  fi
}

# wait for tag in github public repo
MAX_REPEATS=12
DELAY_SEC=10
REPEATS=0

until isTagPresent "${RELEASE_TAG}"; do
  if [ $REPEATS -ge $MAX_REPEATS ]; then
    fail "$RELEASE_TAG is not present"
  fi
  REPEATS=$((REPEATS + 1))
  echo "${RELEASE_TAG} is not present yet (${REPEATS}/${MAX_REPEATS}). Will check again in ${DELAY_SEC} sec"
  sleep $DELAY_SEC
done

echo "${RELEASE_TAG} found. Continuing"

# Create release in github public repository
createRelease "${RELEASE_TAG}"
addAssets "${CREATED_RELEASE_ID}" 'build/dist/*.js'
publishRelease "${CREATED_RELEASE_ID}"
