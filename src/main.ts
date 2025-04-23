import * as core from '@actions/core';
import * as fs from 'fs';
import { execSync } from 'child_process';

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

            // Apptainer image (use default if not provided)
            const image = app.apptainer_image || 'apptainer/maestro.sif';
            core.info(`- Apptainer Image: ${image}`);
            if (fs.existsSync(image)) {
                core.info(`  ✅ Found Apptainer image at ${image}`);
            } else {
                core.warning(`  ⚠️ Apptainer image not found at ${image}`);
            }

            // Build script (optional)
            if (app.build_script) {
                core.info(`- Build Script: ${app.build_script}`);
                if (fs.existsSync(app.build_script)) {
                    core.info(`  ✅ Found build script at ${app.build_script}`);
                } else {
                    core.warning(`  ⚠️ Build script not found at ${app.build_script}`);
                }
            }

            // Create overlay image
            const user = process.env.USER || 'github';
            const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
            const overlay = `/tmp/maestro_overlay_${user}_${timestamp}.img`;
            const overlaySize = 2048;

            if (!fs.existsSync(overlay)) {
                core.info(`[Log] Creating overlay: ${overlay}`);
                execSync(`apptainer overlay create --size ${overlaySize} --create-dir /var/cache/maestro ${overlay}`, { stdio: 'inherit' });
            } else {
                core.info(`[Log] Overlay already exists: ${overlay}`);
            }

            // Run the command in Apptainer container
            const outputFlag = app.output_json ? `--output_file ${app.output_json}` : '';
            const cmd = `apptainer exec --overlay ${overlay} --cleanenv ${image} bash --rcfile /etc/bash.bashrc -c "maestro ${outputFlag} -- ${app.command}"`;

            core.info(`[Log] Executing: ${cmd}`);
            execSync(cmd, { stdio: 'inherit' });
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
