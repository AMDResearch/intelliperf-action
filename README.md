<!--
MIT License

Copyright (c) 2025 Advanced Micro Devices, Inc. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

# 🎼 Maestro Action

A GitHub Action wrapper for Maestro.

---

## ✨ Features

- Supports multiple Maestro formulas:
  - `atomicContention`: Analyzes atomic operation contention
  - `memoryAccess`: Analyzes memory access patterns
  - `bankConflict`: Analyzes bank conflicts
  - `diagnoseOnly`: General diagnostic analysis
- Supports Docker and Apptainer containers
- Optional PR creation with analysis results
- Configurable build, instrument commands and project directory

---

## 📦 Usage

```yaml
name: Example Workflow

on: [push]

jobs:
  run-maestro:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout main repo
        uses: actions/checkout@v3

      - name: Checkout maestro-action
        uses: actions/checkout@v3
        with:
          repository: AARInternal/maestro-action
          token: ${{ secrets.MAESTRO_ACTIONS_TOKEN }}
          path: .github/actions/maestro-action

      - name: Run Maestro Action
        uses: ./.github/actions/maestro-action
        with:
          formula: "atomicContention"  # One of: atomicContention, memoryAccess, bankConflict, diagnoseOnly
          docker_image: "my-default-docker:latest"         # Optional if using Docker
          apptainer_image: "/path/to/default_apptainer.sif" # Optional if using Apptainer
          top_n: "10"                                       # Optional, defaults to 10
          create_pr: "true"                                # Optional, creates PR with changes
          maestro_actions_token: ${{ secrets.MAESTRO_ACTIONS_TOKEN }}  # Required if create_pr is true
          applications: >-
            [
              { 
                "command": "./build/examples/contention/reduction",
                "build_command": "./scripts/build.sh",
                "instrument_command": "./scripts/build.sh --instrument --clean",
                "project_directory": "./",
                "output_json": "${{ env.OUTPUT_JSON }}"
              }
            ]
```

### Formula Examples

#### Atomic Contention Analysis
```yaml
formula: "atomicContention"
applications: >-
  [
    {
      "command": "./build/examples/contention/reduction",
      "build_command": "./scripts/build.sh",
      "instrument_command": "./scripts/build.sh --instrument --clean",
      "project_directory": "./"
    }
  ]
```

#### Memory Access Analysis
```yaml
formula: "memoryAccess"
applications: >-
  [
    {
      "command": "./build/examples/access_pattern/uncoalesced",
      "build_command": "./scripts/build.sh",
      "instrument_command": "./scripts/build.sh --instrument --clean",
      "project_directory": "./"
    }
            ]
```

#### Bank Conflict Analysis
```yaml
formula: "bankConflict"
applications: >-
  [
    {
      "command": "./build/examples/bank_conflict/matrix_transpose",
      "build_command": "./scripts/build.sh",
      "instrument_command": "./scripts/build.sh --instrument --clean",
      "project_directory": "./"
    }
  ]
```

## 🔧 Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `formula` | Maestro formula to use. One of: atomicContention, memoryAccess, bankConflict, diagnoseOnly | Yes | - |
| `applications` | List of application objects | Yes | - |
| `docker_image` | Default Docker image to use | No | - |
| `apptainer_image` | Default Apptainer image to use | No | - |
| `top_n` | Top N kernels to report | No | 10 |
| `huggingface_token` | Huggingface token | No | - |
| `create_pr` | Whether to create a PR with changes | No | false |
| `maestro_actions_token` | GitHub token for PR creation (required if create_pr is true) | No | - |

### Application Object

Each application in the `applications`