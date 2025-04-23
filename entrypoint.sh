#!/bin/bash
set -e

# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --formula) FORMULA="$2"; shift ;;
    --applications) APPLICATIONS="$2"; shift ;;
    *) echo "Unknown parameter passed: $1"; exit 1 ;;
  esac
  shift
done

# Export inputs as GitHub Actions-style environment variables
export INPUT_FORMULA="$FORMULA"
export INPUT_APPLICATIONS="$APPLICATIONS"

# Execute the Node.js action
node /github/workspace/.github/actions/maestro-action/dist/index.js
