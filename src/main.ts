import * as core from '@actions/core';
import * as fs from 'fs';

type Application = {
    command: string;
    output_json?: string;
    build_script?: string;
    apptainer_image?: string;
};

async function run() {
    try {
        const formula = core.getInput("formula");
        if (formula !== "diagnoseOnly") {
            core.setFailed(`Invalid formula: ${formula}. Only "diagnoseOnly" is allowed.`);
            return;
        }

        const appsJson = core.getInput("applications");
        const apps: Application[] = JSON.parse(appsJson);

        core.info(`Formula: ${formula}`);
        core.info("Applications:");

        for (const app of apps) {
            core.info(`- Command: ${app.command}`);
            if (app.output_json) {
                core.info(`- Output File: ${app.output_json}`);
            }

            if (app.apptainer_image) {
                core.info(`- Apptainer Image: ${app.apptainer_image}`);
                if (fs.existsSync(app.apptainer_image)) {
                    core.info(`  ✅ Found Apptainer image at ${app.apptainer_image}`);
                } else {
                    core.warning(`  ⚠️ Apptainer image not found at ${app.apptainer_image}`);
                }
            }

            if (app.build_script) {
                core.info(`- Build Script: ${app.build_script}`);
                if (fs.existsSync(app.build_script)) {
                    core.info(`  ✅ Found build script at ${app.build_script}`);
                } else {
                    core.warning(`  ⚠️ Build script not found at ${app.build_script}`);
                }
            }
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
