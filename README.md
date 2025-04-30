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

- Accepts a `formula` input (must be `"diagnoseOnly"`)

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
          formula: "diagnoseOnly"
          docker_image: "my-default-docker:latest"         # Optional if using Docker
          apptainer_image: "/path/to/default_apptainer.sif" # Optional if using Apptainer
          top_n: "10"                                       # Optional, defaults to 10
          applications: >-
            [
              { "command": "python app1.py", "build_script": "./build.sh", "output_json": "output1.json" },
              { "command": "python app2.py", "output_json": "output2.json" }
            ]

```


## Building

```terminal
npm install
npm install --save-dev @vercel/ncc
npm run build
```
