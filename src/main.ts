import * as core from '@actions/core';

type Application = {
    command: string;
    build_script?: string;
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
            if (app.build_script) {
                core.info(`  Build Script: ${app.build_script}`);
            }
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
