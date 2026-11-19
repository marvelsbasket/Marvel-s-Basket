#!/usr/bin/env bash
# ==============================================================================
# Marvel's Basket — Shell Wrapper for Centralized Docker Management
# Delegates directly to scripts/docker/manage.js
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

node "${ROOT_DIR}/scripts/docker/manage.js" "$@"
