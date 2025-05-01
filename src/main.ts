/****************************************************************************
 * MIT License
 * 
 * Copyright (c) 2025 Advanced Micro Devices, Inc. All Rights Reserved.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 ****************************************************************************/

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

function do_cleanup(workspace: string, dockerImage?: string) {
    core.info(`[Log] Starting cleanup of __pycache__ directories in: ${workspace}`);
    try {
        if (dockerImage) {
            const homeDir = process.env.HOME!;
            const dockerCmd = `docker run \
                --rm \
                -v ${homeDir}:${homeDir} \
                -w ${workspace} \
                ${dockerImage} \
                bash -c "find . -type d -name '__pycache__' -exec rm -rf {} +"`;

            core.info(`[Log] Running cleanup inside Docker container`);
            execSync(dockerCmd, { stdio: 'inherit' });
        } else {
            const findCmd = `find . -type d -name "__pycache__"`;
            const filesToRemove = execSync(findCmd, { cwd: workspace }).toString().trim();

            if (filesToRemove) {
                core.info(`[Log] Found __pycache__ directories to remove:`);
                filesToRemove.split('\n').forEach(dir => {
                    core.info(`[Log] - ${dir}`);
                });
                execSync(`find . -type d -name "__pycache__" -exec rm -rf {} +`, { cwd: workspace, stdio: 'inherit' });
            } else {
                core.info(`[Log] No __pycache__ directories found to clean`);
            }
        }
        core.info(`[Log] Cleanup completed successfully`);
    } catch (error) {
        core.warning(`[Log] Warning: Cleanup step encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function run_in_apptainer(execDir: string, image: string, app: Application, overlay: string, absOutputJson?: string, topN?: string, huggingfaceToken?: string) {
    let maestroCmd = buildMaestroCommand(app, absOutputJson, topN);

    if (huggingfaceToken) {
        maestroCmd = `huggingface-cli login --token ${huggingfaceToken} && ${maestroCmd}`;
    }

    const apptainerCmd = `apptainer exec --overlay ${overlay} --cleanenv ${image} bash --rcfile /etc/bash.bashrc -c "${maestroCmd}"`;

    // Obfuscate the token after "--token"
    let safeApptainerCmd = apptainerCmd;
    if (huggingfaceToken) {
        safeApptainerCmd = apptainerCmd.replace(/(--token)\s+\S+/, '$1 ********');
    }

    core.info(`[Log] Executing in Apptainer: ${safeApptainerCmd}`);
    execSync(apptainerCmd, { cwd: execDir, stdio: 'inherit' });
}

function run_in_docker(execDir: string, image: string, app: Application, absOutputJson?: string, topN?: string, huggingfaceToken?: string) {
    let maestroCmd = buildMaestroCommand(app, absOutputJson, topN);
    const homeDir = process.env.HOME!;

    if (huggingfaceToken) {
        maestroCmd = `huggingface-cli login --token ${huggingfaceToken} && ${maestroCmd}`;
    }

    const dockerCmd = `docker run \
        --rm \
        --user $(id -u):$(id -g) \
        --device=/dev/kfd \
        --device=/dev/dri \
        --group-add video \
        -v ${homeDir}:${homeDir} \
        -w ${execDir} \
        ${image} \
        bash -c "${maestroCmd}"`;

    // Obfuscate the token after "--token"
    let safeDockerCmd = dockerCmd;
    if (huggingfaceToken) {
        safeDockerCmd = dockerCmd.replace(/(--token)\s+\S+/, '$1 ********');
    }

    core.info(`[Log] Executing in Docker: ${safeDockerCmd}`);
    execSync(dockerCmd, { cwd: execDir, stdio: 'inherit' });
}

async function run() {
    try {
        const formula = core.getInput("formula");
        const rawTopN = core.getInput("top_n");
        const topN = rawTopN !== '' ? rawTopN : '10';
        const defaultDockerImage = core.getInput("docker_image");
        const defaultApptainerImage = core.getInput("apptainer_image");
        const huggingfaceToken = core.getInput("huggingface_token");

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
        const fullRepo = process.env.GITHUB_REPOSITORY || 'unknown-repo';
        const repoName = fullRepo.split('/').pop() || 'unknown-repo';
        const today = new Date();
        const dateStr = formatDate(today);

        const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
        const parentDir = path.resolve(workspace, '..');
        const execDir = path.join(parentDir, `maestro_exec_${repoName}_${dateStr}_${jobId}`);

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
                        run_in_apptainer(execDir, apptainerAbsImage, app, overlay, absOutputJson, topN, huggingfaceToken);
                    } finally {
                        deleteOverlay(overlay);
                    }
                } else if (defaultDockerImage) {
                    run_in_docker(execDir, defaultDockerImage, app, absOutputJson, topN, huggingfaceToken);
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

            do_cleanup(workspace, defaultDockerImage);
        }
    } catch (err: any) {
        core.setFailed(`Failed to run action: ${err.message}`);
    }
}

run();
