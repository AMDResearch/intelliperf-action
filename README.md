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

      - name: Checkout maestro-action action
        uses: actions/checkout@v3
        with:
          repository: AARInternal/maestro-action
          token: ${{ secrets.MAESTRO_ACTIONS_TOKEN }}
          path: .github/actions/maestro-action

      - name: Run Maestro Action
        uses: ./.github/actions/maestro-action
        with:
          formula: "diagnoseOnly"
          applications: >-
            [
              { "command": "python app1.py", "build_script": "./build.sh" },
              { "command": "python app2.py" }
            ]
```


## Building

```terminal
npm install
npm install --save-dev @vercel/ncc
npm run build
```
