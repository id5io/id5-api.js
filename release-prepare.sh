#!/usr/bin/env bash

SUCCESS=0
FAIL=1

function fail() {
  echo "$1" >&2
  exit $FAIL
}

function get_package_version() {
  jq .version -r <"$1"/package.json
}

function has_changed() {
  PACKAGE=$1
  DIFF_FILE=/tmp/release_diff.tmp
  git tag -l "${CURRENT_VERSION_TAG}" | grep "$CURRENT_VERSION_TAG"
  if ! (git tag -l "${CURRENT_VERSION_TAG}" | grep "$CURRENT_VERSION_TAG"); then
    fail "Couldn't find current version tag. Can't prepare release"
  fi

  if ! (git diff "${CURRENT_VERSION_TAG}" --name-only >${DIFF_FILE}); then
    fail "Failed to compare with previous version"
  fi
  echo "Checking changes since tag: ${CURRENT_VERSION_TAG} for package ${PACKAGE}"
  grep "${PACKAGE}" "${DIFF_FILE}"
  return $?
}

function update_workspace_package_version() {
  PACKAGE=$1
  if ! (npm version patch -w "${PACKAGE}" --no-git-tag-version 1>/dev/null); then
    fail "Failed to update ${PACKAGE} version"
  fi
}

function update_dependency() {
  DEPENDENCY_NAME=$1
  DEPENDENCY_VERSION=$2
  for path in "${@:3}"; do
    DEPENDANT_PACKAGE="${path}/package.json"
    echo "Updating ${DEPENDENCY_NAME} version to ${DEPENDENCY_VERSION} in ${DEPENDANT_PACKAGE}"
    (jq ".dependencies.\"${DEPENDENCY_NAME}\" = \"${DEPENDENCY_VERSION}\"" <"${DEPENDANT_PACKAGE}" 1>"${DEPENDANT_PACKAGE}.tmp") && mv "${DEPENDANT_PACKAGE}.tmp" "${DEPENDANT_PACKAGE}"
    if [ $? -ne 0 ]; then
      fail "Failed to update ${DEPENDENCY_NAME} version in ${DEPENDANT_PACKAGE}"
    fi
  done
}

ROOT_PATH="."
CURRENT_VERSION=$(get_package_version ${ROOT_PATH})
CURRENT_VERSION_TAG="v${CURRENT_VERSION}"
DIAGNOSTICS_PATH="packages/diagnostics"
DIAGNOSTICS_NAME="@id5io/diagnostics"
MULTIPLEXING_PATH="packages/multiplexing"
MULTIPLEXING_NAME="@id5io/multiplexing"
DIAGNOSTICS_CURRENT_VERSION=$(get_package_version ${DIAGNOSTICS_PATH})
MULTIPLEXING_CURRENT_VERSION=$(get_package_version ${MULTIPLEXING_PATH})
echo "Preparing release"
echo "Current API version ${CURRENT_VERSION}"
echo "Current ${DIAGNOSTICS_NAME} version ${DIAGNOSTICS_CURRENT_VERSION}"
echo "Current ${MULTIPLEXING_NAME} version ${MULTIPLEXING_CURRENT_VERSION}"

# Update diagnostics version
if has_changed "${DIAGNOSTICS_PATH}"; then
  echo "${DIAGNOSTICS_NAME} has been changed. Updating version..."
  update_workspace_package_version "${DIAGNOSTICS_PATH}"
  DIAGNOSTICS_NEW_VERSION=$(get_package_version "${DIAGNOSTICS_PATH}")
  echo "${DIAGNOSTICS_NAME} version updated to ${DIAGNOSTICS_NEW_VERSION}"
  update_dependency "$DIAGNOSTICS_NAME" "${DIAGNOSTICS_NEW_VERSION}" "${MULTIPLEXING_PATH}" "${ROOT_PATH}"
else
  echo "${DIAGNOSTICS_NAME} hasn't been changed. Skip version update"
fi

# Update multiplexing version
if has_changed "${MULTIPLEXING_PATH}"; then
  echo "${MULTIPLEXING_NAME} has been changed. Updating version..."
  update_workspace_package_version "${MULTIPLEXING_PATH}"
  MULTIPLEXING_NEW_VERSION=$(get_package_version "${MULTIPLEXING_PATH}")
  echo "${MULTIPLEXING_NAME} version updated to ${MULTIPLEXING_NEW_VERSION}"
  update_dependency "${MULTIPLEXING_NAME}" "${MULTIPLEXING_NEW_VERSION}" "${ROOT_PATH}"
else
  echo "${MULTIPLEXING_NAME} hasn't been changed. Skip version update"
fi

echo "Updating API version"
if ! (npm version patch --no-git-tag-version); then
  fail "Failed to update API version"
fi
NEW_VERSION=$(get_package_version "${ROOT_PATH}")
echo "API version updated to ${NEW_VERSION}"

TAG="v${NEW_VERSION}"
RELEASE_NOTES_FILE="release_notes/${TAG}.md"
if [ ! -f "${RELEASE_NOTES_FILE}" ]; then
  fail "Missing release notes file ${RELEASE_NOTES_FILE}. Create and update then prepare release again"
fi

echo "Updating README file"
sed -i "s/${CURRENT_VERSION}/${NEW_VERSION}/g" "${ROOT_PATH}/README.md"

COMMIT_MESSAGE="Release v${NEW_VERSION}"
if [ "${DIAGNOSTICS_NEW_VERSION}" != "" ]; then
  COMMIT_MESSAGE="$COMMIT_MESSAGE, ${DIAGNOSTICS_NAME} v${DIAGNOSTICS_NEW_VERSION}"
fi

if [ "${MULTIPLEXING_NEW_VERSION}" != "" ]; then
  COMMIT_MESSAGE="$COMMIT_MESSAGE, ${MULTIPLEXING_NAME} v${MULTIPLEXING_NEW_VERSION}"
fi

git add .
git commit -a -m "${COMMIT_MESSAGE}"
TAG="v${NEW_VERSION}"
if [ ${CI_DEFAULT_BRANCH} != ${CI_COMMIT_REF_NAME} ]; then # for testing purpose
  TAG="${TAG}-${CI_COMMIT_REF_NAME}"
fi
git tag "${TAG}"
