import { readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  uploadFile,
  createOfficialPrediction,
  pollPrediction,
  downloadFile,
} from "./replicate-helpers.js";
import {
  checkFfmpeg,
  normalizeVideo,
  replaceAudio,
} from "./ffmpeg.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "data", "images");
const VIDEOS_DIR = join(ROOT, "data", "videos");
const SCRIPT_PATH = join(ROOT, "script.md");

// Models
const AUDIO_MODEL_OWNER = "minimax";
const AUDIO_MODEL_NAME = "speech-2.8-hd";
const VIDEO_MODEL_OWNER = "veed";
const VIDEO_MODEL_NAME = "fabric-1.0";
const VIDEO_RESOLUTION = "720p";
const VOICE_ID = "R8_JURR4DHK";

// Segment image filenames in order
const IMAGE_FILES = [
  "01-intro.jpg",
  "02-thesis.jpg",
  "03-project-think.jpg",
  "04-sandboxes.jpg",
  "05-durable-objects.jpg",
  "06-browser-run.jpg",
  "07-voice-agents.jpg",
  "08-email-service.jpg",
  "09-ai-search.jpg",
  "10-registrar-api.jpg",
  "11-artifacts.jpg",
  "12-ai-platform.jpg",
  "13-high-perf-llms.jpg",
  "14-cf-cli.jpg",
  "15-oauth-mesh.jpg",
  "16-closer.jpg",
];

interface Segment {
  index: number;
  text: string;
  imageFile: string;
  imagePath: string;
}

function log(msg: string) {
  process.stderr.write(`${msg}\n`);
}

function splitScript(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

async function generateAudio(segments: Segment[], tmpDir: string): Promise<string[]> {
  log(`generating ${segments.length} audio segments...`);

  // Fire all TTS predictions concurrently
  const predictions = await Promise.all(
    segments.map(async (seg) => {
      const pred = await createOfficialPrediction(AUDIO_MODEL_OWNER, AUDIO_MODEL_NAME, {
        text: seg.text,
        voice_id: VOICE_ID,
        speed: 1.0,
        audio_format: "mp3",
        sample_rate: 32000,
        emotion: "auto",
        english_normalization: true,
      });
      log(`  audio seg ${seg.index}: prediction ${pred.id}`);
      return { id: pred.id, index: seg.index };
    })
  );

  // Poll all concurrently
  log(`polling ${predictions.length} audio predictions...`);
  const results = await Promise.all(
    predictions.map(async (p) => {
      const result = await pollPrediction(p.id);
      const time = result.metrics?.total_time;
      log(`  audio seg ${p.index} done${time ? ` (${time.toFixed(0)}s)` : ""}`);
      return { index: p.index, output: result.output as string };
    })
  );

  // Download
  const paths: string[] = [];
  for (const r of results.sort((a, b) => a.index - b.index)) {
    const outPath = join(tmpDir, `audio-${String(r.index).padStart(2, "0")}.mp3`);
    await downloadFile(r.output, outPath);
    paths.push(outPath);
  }

  log(`${paths.length} audio segments downloaded`);
  return paths;
}

async function generateVideos(
  segments: Segment[],
  audioFiles: string[],
  tmpDir: string
): Promise<string[]> {
  log(`generating ${segments.length} video segments...`);

  // Upload all images
  log("uploading images...");
  const imageUrls: string[] = [];
  for (const seg of segments) {
    const url = await uploadFile(seg.imagePath);
    imageUrls.push(url);
    log(`  uploaded ${seg.imageFile}`);
  }

  // Upload all audio files
  log("uploading audio files...");
  const audioUrls: string[] = [];
  for (const audioPath of audioFiles) {
    const url = await uploadFile(audioPath);
    audioUrls.push(url);
  }

  // Fire all video predictions concurrently
  log("starting video predictions...");
  const predictions = await Promise.all(
    segments.map(async (seg, i) => {
      const pred = await createOfficialPrediction(VIDEO_MODEL_OWNER, VIDEO_MODEL_NAME, {
        image: imageUrls[i],
        audio: audioUrls[i],
        resolution: VIDEO_RESOLUTION,
      });
      log(`  video seg ${seg.index}: prediction ${pred.id}`);
      return { id: pred.id, index: seg.index };
    })
  );

  // Poll all concurrently
  log(`polling ${predictions.length} video predictions...`);
  const results = await Promise.all(
    predictions.map(async (p) => {
      const result = await pollPrediction(p.id);
      const time = result.metrics?.total_time;
      log(`  video seg ${p.index} done${time ? ` (${time.toFixed(0)}s)` : ""}`);
      return { index: p.index, output: result.output as string };
    })
  );

  // Download
  const paths: string[] = [];
  for (const r of results.sort((a, b) => a.index - b.index)) {
    const outPath = join(tmpDir, `video-raw-${String(r.index).padStart(2, "0")}.mp4`);
    await downloadFile(r.output, outPath);
    paths.push(outPath);
  }

  log(`${paths.length} video segments downloaded`);
  return paths;
}

async function main() {
  const startTime = Date.now();

  // Parse args: optional segment numbers to regenerate
  const args = process.argv.slice(2);
  const segmentFilter = args
    .filter((a) => !a.startsWith("-"))
    .map((a) => parseInt(a, 10) - 1) // Convert 1-indexed to 0-indexed
    .filter((n) => !isNaN(n));

  // Preflight
  await checkFfmpeg();

  // Read and split script
  const scriptText = readFileSync(SCRIPT_PATH, "utf-8");
  const paragraphs = splitScript(scriptText);

  if (paragraphs.length !== IMAGE_FILES.length) {
    log(`WARNING: script has ${paragraphs.length} paragraphs but expected ${IMAGE_FILES.length}`);
  }

  // Build segments
  const allSegments: Segment[] = paragraphs.map((text, i) => ({
    index: i,
    text,
    imageFile: IMAGE_FILES[i] || `${String(i + 1).padStart(2, "0")}-unknown.jpg`,
    imagePath: join(IMAGES_DIR, IMAGE_FILES[i] || ""),
  }));

  // Filter to requested segments, or all
  const segments = segmentFilter.length > 0
    ? allSegments.filter((s) => segmentFilter.includes(s.index))
    : allSegments;

  log(`processing ${segments.length} segment(s)...`);
  for (const seg of segments) {
    log(`  seg ${seg.index + 1}: ${seg.imageFile} (${seg.text.split(/\s+/).length} words)`);
    if (!existsSync(seg.imagePath)) {
      throw new Error(`Image not found: ${seg.imagePath}`);
    }
  }

  // Create output dirs
  const tmpDir = join(ROOT, "data", "tmp");
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(VIDEOS_DIR, { recursive: true });

  // Step 1: Generate audio
  log("\n--- Step 1: Generate audio ---");
  const audioFiles = await generateAudio(segments, tmpDir);

  // Step 2: Generate video
  log("\n--- Step 2: Generate video ---");
  const rawVideoFiles = await generateVideos(segments, audioFiles, tmpDir);

  // Step 3: Normalize and replace audio
  log("\n--- Step 3: Normalize and finalize ---");
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const rawVideo = rawVideoFiles[i];
    const audio = audioFiles[i];

    const normPath = join(tmpDir, `norm-${String(seg.index).padStart(2, "0")}.mp4`);
    const finalPath = join(VIDEOS_DIR, seg.imageFile.replace(".jpg", ".mp4"));

    log(`  normalizing seg ${seg.index + 1}...`);
    await normalizeVideo(rawVideo, normPath);

    log(`  replacing audio seg ${seg.index + 1}...`);
    await replaceAudio(normPath, audio, finalPath);

    log(`  -> ${finalPath}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  log(`\ndone in ${elapsed}s. Videos saved to data/videos/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
