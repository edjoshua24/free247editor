#!/usr/bin/env node
// Builds a CapCut desktop project from an edit plan, so the user can open and tweak the cut in CapCut.
//
//   node tools/capcut-draft.mjs plan.json [--replace]
//
// --replace overwrites a project of the same name that this tool made earlier.
//
// plan.json:
//   {
//     "name": "Safari - v1",
//     "width": 1920, "height": 1080, "fps": 30,
//     "tracks": [
//       { "clips": [ { "file": "inbox/speakers/a.mp4", "in": 12.3, "out": 18.9 } ] },
//       { "clips": [ { "file": "inbox/broll/lion.mp4", "in": 4, "out": 7.5, "at": 2.1, "volume": 0 } ] }
//     ]
//   }
//
// Times are in seconds. The first track is the main track; later tracks are overlays (b-roll) on top.
// A clip without "at" starts where the previous clip on its track ends. Cuts only: no transitions or effects.
// The template in tools/capcut-template/ was copied from a project saved by CapCut 9.7.
// Close CapCut before running, since it rewrites its project list on exit.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const templateDir = path.join(here, 'capcut-template');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, j) => fs.writeFileSync(f, JSON.stringify(j));
const uuid = () => crypto.randomUUID().toUpperCase();
const us = (sec) => Math.round(sec * 1e6);
const slash = (p) => p.replace(/\\/g, '/');

const planFile = process.argv[2];
if (!planFile) {
  console.error('Usage: node tools/capcut-draft.mjs plan.json');
  process.exit(1);
}
const plan = readJson(planFile);
const planDir = path.dirname(path.resolve(planFile));
const repoRoot = path.resolve(here, '..');

const draftRoot = process.env.CAPCUT_DRAFTS ||
  path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft');
if (!fs.existsSync(draftRoot)) {
  console.error(`CapCut projects folder not found: ${draftRoot}\nOpen CapCut once, or set CAPCUT_DRAFTS.`);
  process.exit(1);
}

const probes = new Map();
function probe(file) {
  if (probes.has(file)) return probes.get(file);
  const out = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' }));
  const v = out.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error(`No video stream in ${file}`);
  let { width, height } = v;
  const rotation = Math.abs(Number(v.tags?.rotate ?? v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0));
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  const info = {
    width,
    height,
    duration: us(Number(out.format.duration)),
    hasAudio: out.streams.some((s) => s.codec_type === 'audio'),
    localId: crypto.randomUUID(),
  };
  probes.set(file, info);
  return info;
}

function resolveFile(f) {
  for (const base of [planDir, repoRoot, process.cwd()]) {
    const p = path.resolve(base, f);
    if (fs.existsSync(p)) return slash(p);
  }
  throw new Error(`Clip not found: ${f}`);
}

// Template pieces from one video segment saved by CapCut.
const tplContent = readJson(path.join(templateDir, 'draft_content.json'));
const tplTrack = tplContent.tracks[0];
const tplSeg = tplTrack.segments[0];
const tplMat = tplContent.materials;
const refKinds = ['speeds', 'placeholder_infos', 'canvases', 'sound_channel_mappings', 'material_colors', 'vocal_separations'];

const content = structuredClone(tplContent);
content.name = '';
content.fps = plan.fps || 30;
content.canvas_config = { ...content.canvas_config, ratio: 'original', width: plan.width || 1920, height: plan.height || 1080 };
for (const k of Object.keys(content.materials)) if (Array.isArray(content.materials[k])) content.materials[k] = [];
content.tracks = [];

let totalEnd = 0;
const files = new Set();
plan.tracks.forEach((track, ti) => {
  const t = { ...structuredClone(tplTrack), id: uuid(), segments: [], flag: ti === 0 ? 0 : 2 };
  let cursor = 0;
  for (const clip of track.clips) {
    const file = resolveFile(clip.file);
    files.add(file);
    const info = probe(file);
    const start = us(clip.in ?? 0);
    const dur = us(clip.out ?? info.duration / 1e6) - start;
    if (dur <= 0) throw new Error(`Clip ${clip.file} has out before in`);
    const at = clip.at !== undefined ? us(clip.at) : cursor;
    cursor = at + dur;
    totalEnd = Math.max(totalEnd, cursor);

    const mat = structuredClone(tplMat.videos[0]);
    Object.assign(mat, {
      id: uuid(),
      unique_id: crypto.randomBytes(16).toString('hex'),
      path: file,
      material_name: path.basename(file),
      duration: info.duration,
      width: info.width,
      height: info.height,
      has_audio: info.hasAudio,
      local_material_id: info.localId,
    });
    content.materials.videos.push(mat);

    const refs = refKinds.map((k) => {
      const m = { ...structuredClone(tplMat[k][0]), id: uuid() };
      content.materials[k].push(m);
      return m.id;
    });

    const volume = clip.volume ?? (ti === 0 ? 1 : 0);
    t.segments.push({
      ...structuredClone(tplSeg),
      id: uuid(),
      material_id: mat.id,
      extra_material_refs: refs,
      source_timerange: { start, duration: dur },
      target_timerange: { start: at, duration: dur },
      volume,
      last_nonzero_volume: volume || 1,
      render_index: ti,
      track_render_index: ti,
    });
  }
  t.segments.sort((a, b) => a.target_timerange.start - b.target_timerange.start);
  content.tracks.push(t);
});
content.duration = totalEnd;

// Project folder, named after the plan. An existing project is kept unless --replace is given and
// the project was made by this tool (its folder has our marker file).
let name = plan.name || 'free247editor edit';
let dir = path.join(draftRoot, name);
const marker = '.free247editor';
if (process.argv.includes('--replace') && fs.existsSync(path.join(dir, marker))) fs.rmSync(dir, { recursive: true });
for (let n = 2; fs.existsSync(dir); n++) dir = path.join(draftRoot, `${plan.name || 'free247editor edit'} (${n})`);
name = path.basename(dir);
// CapCut only opens a project whose content id is its main timeline id.
const timelineId = uuid();
content.id = timelineId;
const draftId = uuid();
const nowUs = Date.now() * 1000;
const fold = slash(dir);

fs.mkdirSync(path.join(dir, 'Timelines', timelineId), { recursive: true });
fs.writeFileSync(path.join(dir, marker), '');
writeJson(path.join(dir, 'draft_content.json'), content);
writeJson(path.join(dir, 'Timelines', timelineId, 'draft_content.json'), content);

const project = readJson(path.join(templateDir, 'timelines_project.json'));
Object.assign(project, { id: uuid(), main_timeline_id: timelineId, create_time: nowUs, update_time: nowUs });
project.timelines = [{ create_time: nowUs, id: timelineId, is_marked_delete: false, name: 'Timeline 01', update_time: nowUs }];
writeJson(path.join(dir, 'Timelines', 'project.json'), project);

const layout = readJson(path.join(templateDir, 'timeline_layout.json'));
layout.dockItems = [{ dockIndex: 0, ratio: 1, timelineIds: [timelineId], timelineNames: ['Timeline 01'] }];
writeJson(path.join(dir, 'timeline_layout.json'), layout);

const fileList = [...files];
const meta = readJson(path.join(templateDir, 'draft_meta_info.json'));
Object.assign(meta, {
  draft_id: draftId,
  draft_name: name,
  draft_fold_path: fold,
  draft_root_path: draftRoot,
  draft_cover: '',
  tm_draft_create: nowUs,
  tm_draft_modified: nowUs,
  tm_duration: totalEnd,
  draft_timeline_materials_size_: 0,
});
const tplMaterial = meta.draft_materials[0].value.find((m) => m.metetype === 'video');
meta.draft_materials[0].value = fileList.map((f) => {
  const info = probes.get(f);
  return {
    ...tplMaterial,
    id: info.localId,
    file_Path: f,
    extra_info: path.basename(f),
    duration: info.duration,
    width: info.width,
    height: info.height,
    create_time: Math.floor(Date.now() / 1000),
    import_time: Math.floor(Date.now() / 1000),
    import_time_ms: nowUs,
    roughcut_time_range: { duration: info.duration, start: 0 },
  };
});
writeJson(path.join(dir, 'draft_meta_info.json'), meta);

const store = readJson(path.join(templateDir, 'draft_virtual_store.json'));
store.draft_virtual_store[1].value = fileList.map((f) => ({ child_id: probes.get(f).localId, parent_id: '' }));
writeJson(path.join(dir, 'draft_virtual_store.json'), store);

const nowS = Math.floor(Date.now() / 1000);
fs.writeFileSync(path.join(dir, 'draft_settings'),
  `[General]\ndraft_create_time=${nowS}\ndraft_last_edit_time=${nowS}\nreal_edit_seconds=0\nreal_edit_keys=0\n`);

// Add it to CapCut's project list so it shows on the home screen.
const rootMetaFile = path.join(draftRoot, 'root_meta_info.json');
if (fs.existsSync(rootMetaFile)) {
  fs.copyFileSync(rootMetaFile, rootMetaFile + '.free247editor.bak');
  const rootMeta = readJson(rootMetaFile);
  rootMeta.all_draft_store = rootMeta.all_draft_store.filter((e) => slash(e.draft_fold_path || '') !== fold);
  const tplEntry = rootMeta.all_draft_store[0] || {};
  rootMeta.all_draft_store.unshift({
    ...tplEntry,
    draft_cover: '',
    draft_fold_path: fold,
    draft_id: draftId,
    draft_json_file: `${fold}\\draft_content.json`,
    draft_name: name,
    draft_root_path: slash(draftRoot),
    draft_timeline_materials_size: 0,
    tm_draft_create: nowUs,
    tm_draft_modified: nowUs,
    tm_duration: totalEnd,
  });
  writeJson(rootMetaFile, rootMeta);
}

console.log(`CapCut project "${name}" saved (${(totalEnd / 1e6).toFixed(1)}s, ${content.tracks.length} tracks).`);
console.log(fold);
