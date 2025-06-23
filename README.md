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

# 🎼 IntelliPerf Action

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!IMPORTANT]  
> This project is intended for research purposes only and is provided by AMD Research and Advanced Development team. 
This is not a product. Use it at your own risk and discretion.

A GitHub Action wrapper for [IntelliPerf](https://github.com/AMDResearch/intelliperf).

---

## ✨ Features

- Supports multiple IntelliPerf formulas:
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
  run-intelliperf:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout main repo
        uses: actions/checkout@v3

      - name: Checkout intelliperf-action
        uses: actions/checkout@v3
        with:
          repository: AARInternal/intelliperf-action
          token: ${{ secrets.INTELLIPERF_ACTIONS_TOKEN }}
          path: .github/actions/intelliperf-action

      - name: Run IntelliPerf Action
        uses: ./.github/actions/intelliperf-action
        with:
          formula: "atomicContention"  # One of: atomicContention, memoryAccess, bankConflict, diagnoseOnly
          docker_image: "my-default-docker:latest"         # Optional if using Docker
          apptainer_image: "/path/to/default_apptainer.sif" # Optional if using Apptainer
          top_n: "10"                                       # Optional, defaults to 10
          create_pr: "true"                                # Optional, creates PR with changes
          intelliperf_actions_token: ${{ secrets.INTELLIPERF_ACTIONS_TOKEN }}  # Required if create_pr is true
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
| `formula` | IntelliPerf formula to use. One of: atomicContention, memoryAccess, bankConflict, diagnoseOnly | Yes | - |
| `applications` | List of application objects | Yes | - |
| `docker_image` | Default Docker image to use | No | - |
| `apptainer_image` | Default Apptainer image to use | No | - |
| `top_n` | Top N kernels to report | No | 10 |
| `huggingface_token` | Huggingface token | No | - |
| `create_pr` | Whether to create a PR with changes | No | false |
| `intelliperf_actions_token` | GitHub token for PR creation (required if create_pr is true) | No | - |

### Application Object

Each application in the `applications`