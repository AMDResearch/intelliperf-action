import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { mkdtempSync } from 'fs';
import * as os from 'os';

type Application = {
    command: string;
    output_json?: string;
    build_script?: string;
    apptainer_image?: string;
};

function abs(p: string): string {
    return path.isAbsolute(p) ? p : path.resolve(p);
}

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
            // Resolve absolute paths
            const command = app.command;
            const absOutputJson = app.output_json ? abs(app.output_json) : undefined;
            const absBuildScript = app.build_script ? abs(app.build_script) : undefined;
            const absImage = abs(app.apptainer_image || 'apptainer/maestro.sif');

            core.info(`- Command: ${command}`);
            if (absOutputJson) {
                core.info(`- Output File: ${absOutputJson}`);
            }

            core.info(`- Apptainer Image: ${absImage}`);
            if (fs.existsSync(absImage)) {
                core.info(`  ✅ Found Apptainer image at ${absImage}`);
            } else {
                core.warning(`  ⚠️ Apptainer image not found at ${absImage}`);
            }

            if (absBuildScript) {
                core.info(`- Build Script: ${absBuildScript}`);
                if (fs.existsSync(absBuildScript)) {
                    core.info(`  ✅ Found build script at ${absBuildScript}`);
                } else {
                    core.warning(`  ⚠️ Build script not found at ${absBuildScript}`);
                }
            }

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

            const outputFlag = absOutputJson ? `--output_file ${absOutputJson}` : '';
            const maestroCmd = `maestro -vvv ${outputFlag} -- ${command}`;
            const apptainerCmd = `apptainer exec --overlay ${overlay} --cleanenv ${absImage} bash --rcfile /etc/bash.bashrc -c "${maestroCmd}"`;

            // Create a temp dir and run inside it
            const tempDir = mkdtempSync(path.join(os.tmpdir(), 'maestro_exec_'));
            core.info(`[Log] Created temp dir: ${tempDir}`);

            core.info(`[Log] Executing in temp dir: ${apptainerCmd}`);
            try {
                execSync(apptainerCmd, { cwd: tempDir, stdio: 'inherit' });
            } catch (error) {
                if (error instanceof Error) {
                    core.warning(`::warning::Failed to run command: ${apptainerCmd}`);
                    core.warning(`::warning::Error message: ${error.message}`);
                } else {
                    core.warning(`::warning::Unknown error while running: ${apptainerCmd}`);
                }
            }
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
