import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

type Application = {
    command: string;
    output_json?: string;
    build_script?: string;
};

function abs(p: string): string {
    return path.isAbsolute(p) ? p : path.resolve(p);
}

function formatDate(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}${dd}${yyyy}`;
}

function createOverlay(): string {
    const user = process.env.USER || 'github';
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
    const overlay = `/tmp/maestro_overlay_${user}_${timestamp}.img`;
    const overlaySize = 2048;

    core.info(`[Log] Creating overlay: ${overlay}`);
    execSync(`apptainer overlay create --size ${overlaySize} --create-dir /var/cache/maestro ${overlay}`, { stdio: 'inherit' });

    return overlay;
}

function deleteOverlay(overlayPath: string) {
    if (fs.existsSync(overlayPath)) {
        core.info(`[Log] Deleting overlay: ${overlayPath}`);
        fs.unlinkSync(overlayPath);
    }
}

function buildMaestroCommand(app: Application, absOutputJson?: string, topN?: string): string {
    const outputFlag = absOutputJson ? `--output_file ${absOutputJson}` : '';
    const topNFlag = topN ? `--top-n ${topN}` : '';
    return `maestro -vvv ${outputFlag} ${topNFlag} -- ${app.command}`;
}

function run_in_apptainer(execDir: string, image: string, app: Application, overlay: string, absOutputJson?: string, topN?: string) {
    const maestroCmd = buildMaestroCommand(app, absOutputJson, topN);
    const apptainerCmd = `apptainer exec --overlay ${overlay} --cleanenv ${image} bash --rcfile /etc/bash.bashrc -c "${maestroCmd}"`;

    core.info(`[Log] Executing in Apptainer: ${apptainerCmd}`);
    execSync(apptainerCmd, { cwd: execDir, stdio: 'inherit' });
}

function run_in_docker(image: string, app: Application, absOutputJson?: string, topN?: string) {
    const maestroCmd = buildMaestroCommand(app, absOutputJson, topN);
    const execDir = process.cwd();
    const homeDir = process.env.HOME!;

    const dockerCmd = `docker run --rm \
        --device=/dev/kfd \
        --device=/dev/dri \
        --group-add video \
        -v ${execDir}:${execDir} \
        -v ${homeDir}:${homeDir} \
        -w ${execDir} \
        ${image} \
        bash -c "${maestroCmd}"`;

    core.info(`[Log] Executing in Docker: ${dockerCmd}`);
    execSync(dockerCmd, { cwd: execDir, stdio: 'inherit' });
}

async function run() {
    try {
        const formula = core.getInput("formula");
        const rawTopN = core.getInput("top_n");
        const topN = rawTopN !== '' ? rawTopN : '10';
        const defaultDockerImage = core.getInput("docker_image");
        const defaultApptainerImage = core.getInput("apptainer_image");

        if (formula !== "diagnoseOnly") {
            core.setFailed(`Invalid formula: ${formula}. Only "diagnoseOnly" is allowed.`);
            return;
        }

        const appsJson = core.getInput("applications");
        const apps: Application[] = JSON.parse(appsJson);

        core.info(`Formula: ${formula}`);
        core.info(`Top N: ${topN}`);
        if (defaultDockerImage) {
            core.info(`Default Docker Image: ${defaultDockerImage}`);
        }
        if (defaultApptainerImage) {
            core.info(`Default Apptainer Image: ${defaultApptainerImage}`);
        }
        core.info("Applications:");


        const jobId = process.env.GITHUB_JOB || 'localjob';
        const today = new Date();
        const dateStr = formatDate(today);

        const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
        const parentDir = path.resolve(workspace, '..');
        const execDir = path.join(parentDir, `maestro_exec_${dateStr}_${jobId}`);

        if (!fs.existsSync(execDir)) {
            fs.mkdirSync(execDir, { recursive: true });
            core.info(`[Log] Created execution directory: ${execDir}`);
        } else {
            core.info(`[Log] Execution directory already exists: ${execDir}`);
        }

        for (const app of apps) {
            const absOutputJson = app.output_json ? abs(app.output_json) : undefined;
            const absBuildScript = app.build_script ? abs(app.build_script) : undefined;

            core.info(`- Command: ${app.command}`);
            if (absOutputJson) core.info(`- Output File: ${absOutputJson}`);
            if (absBuildScript) {
                core.info(`- Build Script: ${absBuildScript}`);
                if (!fs.existsSync(absBuildScript)) {
                    core.warning(`⚠️ Build script not found at ${absBuildScript}`);
                }
            }


            try {
                if (defaultApptainerImage) {
                    const apptainerAbsImage = abs(defaultApptainerImage);
                    const overlay = createOverlay();

                    try {
                        run_in_apptainer(execDir, apptainerAbsImage, app, overlay, absOutputJson, topN);
                    } finally {
                        deleteOverlay(overlay);
                    }
                } else if (defaultDockerImage) {
                    run_in_docker(execDir, defaultDockerImage, app, absOutputJson, topN);
                } else {
                    core.warning('No available container image to run the application.');
                }
            } catch (error) {
                if (error instanceof Error) {
                    core.warning(`::warning::Failed to run application command`);
                    core.warning(`::warning::Error message: ${error.message}`);
                } else {
                    core.warning(`::warning::Unknown error occurred`);
                }
            }
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
