import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import type {MotionProject} from '@motion-master/schema';

let bundlePromise: Promise<string> | undefined;
const renderEntryPoint = () => process.env.MOTION_MASTER_REMOTION_ENTRY ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'entry.tsx');
const serveUrl = () => bundlePromise ??= bundle({entryPoint: renderEntryPoint()});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ffprobeExecutable = (createRequire(import.meta.url)('ffprobe-static') as {path: string}).path;
const ffmpegExecutable = process.env.MOTION_MASTER_FFMPEG ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');

const runFfprobe = async (input: string) => new Promise<Record<string, unknown>>((resolve, reject) => {
  const child = spawn(ffprobeExecutable, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames', '-of', 'json', input], {windowsHide: true});
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(JSON.parse(Buffer.concat(stdout).toString('utf8'))) : reject(new Error(Buffer.concat(stderr).toString('utf8') || `ffprobe exited with ${code}`)));
});

const runProcess = (executable: string, args: string[]) => new Promise<void>((resolve, reject) => {
  const child = spawn(executable, args, {windowsHide: true});
  const stderr: Buffer[] = [];
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(Buffer.concat(stderr).toString('utf8') || `${path.basename(executable)} exited with ${code}`)));
});

export {renderProjectRoughCut,findRoughCut} from './rough-cut';

export const renderProjectStills = async (project: MotionProject, projectDirectory: string) => {
  const outputDirectory = path.join(projectDirectory, 'renders', `verification-v${project.version}`);
  await mkdir(outputDirectory, {recursive: true});
  const url = await serveUrl();
  const inputProps = {project};
  const composition = await selectComposition({serveUrl: url, id: 'MotionProject', inputProps, browserExecutable, chromeMode: 'chrome-for-testing', timeoutInMilliseconds: 60000});
  const frames = [0, Math.floor((composition.durationInFrames - 1) / 2), composition.durationInFrames - 1];
  const names = ['start.png', 'mid.png', 'end.png'];
  const outputPaths: string[] = [];
  for (let index = 0; index < frames.length; index += 1) {
    const output = path.join(outputDirectory, names[index]);
    await renderStill({composition, serveUrl: url, output, frame: frames[index], inputProps, imageFormat: 'png', browserExecutable, chromeMode: 'chrome-for-testing', timeoutInMilliseconds: 60000});
    outputPaths.push(output);
  }
  const manifest = {renderId: `verification-v${project.version}`, projectId: project.projectId, version: project.version, status: 'completed', frames, outputPaths, createdAt: new Date().toISOString()};
  await writeFile(path.join(projectDirectory, 'renders', 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};

export const renderProjectMp4 = async (project: MotionProject, projectDirectory: string, videoSrc?: string) => {
  const outputDirectory = path.join(projectDirectory, 'renders', `video-v${project.version}`);
  await mkdir(outputDirectory, {recursive: true});
  const url = await serveUrl();
  const inputProps = {project, videoSrc};
  const composition = await selectComposition({serveUrl: url, id: 'MotionProject', inputProps, browserExecutable, chromeMode: 'chrome-for-testing', timeoutInMilliseconds: 60000});
  const output = path.join(outputDirectory, `${project.projectId}.mp4`);
  await renderMedia({composition, serveUrl: url, outputLocation: output, inputProps, codec: 'h264', browserExecutable, chromeMode: 'chrome-for-testing', timeoutInMilliseconds: 60000, concurrency: 2});
  const manifest = {renderId: `video-v${project.version}`, projectId: project.projectId, version: project.version, status: 'completed', outputPaths: [output], createdAt: new Date().toISOString()};
  await writeFile(path.join(projectDirectory, 'renders', 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};

export const renderProjectAlphaMov = async (project: MotionProject, projectDirectory: string) => {
  const outputDirectory = path.join(projectDirectory, 'renders', `alpha-v${project.version}`);
  await mkdir(outputDirectory, {recursive: true});
  const url = await serveUrl();
  const inputProps = {project};
  const composition = await selectComposition({serveUrl: url, id: 'MotionProject', inputProps, browserExecutable, chromeMode: 'chrome-for-testing', timeoutInMilliseconds: 60000});
  const output = path.join(outputDirectory, `${project.projectId}-alpha.mov`);
  await renderMedia({
    composition,
    serveUrl: url,
    outputLocation: output,
    inputProps,
    codec: 'prores',
    proResProfile: '4444',
    pixelFormat: 'yuva444p10le',
    imageFormat: 'png',
    browserExecutable,
    chromeMode: 'chrome-for-testing',
    timeoutInMilliseconds: 60000,
    concurrency: 2,
  });
  const probe = await runFfprobe(output);
  const stream = Array.isArray(probe.streams) ? probe.streams[0] as Record<string, unknown> | undefined : undefined;
  if (!String(stream?.pix_fmt ?? '').startsWith('yuva')) throw new Error(`Alpha verification failed: pixel format is ${String(stream?.pix_fmt ?? 'unknown')}`);
  const verification = await renderProjectStills(project, projectDirectory);
  const manifest = {renderId: `alpha-v${project.version}`, projectId: project.projectId, version: project.version, kind: 'alpha-mov', status: 'completed', outputPaths: [output], probe, verificationFrames: verification.outputPaths, createdAt: new Date().toISOString()};
  await writeFile(path.join(outputDirectory, 'ffprobe.json'), `${JSON.stringify(probe, null, 2)}\n`, 'utf8');
  await writeFile(path.join(projectDirectory, 'renders', 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
};
