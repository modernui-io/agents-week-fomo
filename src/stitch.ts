import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkFfmpeg, stitchVideos, getDuration } from "./ffmpeg.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VIDEOS_DIR = join(ROOT, "data", "videos");

function log(msg: string) {
  process.stderr.write(`${msg}\n`);
}

async function main() {
  const outputPath = process.argv[2] || join(ROOT, "output.mp4");

  await checkFfmpeg();

  // Find all segment videos, sorted by filename
  const files = readdirSync(VIDEOS_DIR)
    .filter((f) => f.endsWith(".mp4"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .mp4 files found in ${VIDEOS_DIR}. Run the pipeline first.`);
  }

  log(`stitching ${files.length} segments:`);
  const videoPaths: string[] = [];
  for (const f of files) {
    const fullPath = join(VIDEOS_DIR, f);
    if (!existsSync(fullPath)) {
      throw new Error(`Missing: ${fullPath}`);
    }
    videoPaths.push(fullPath);
    log(`  ${f}`);
  }

  log(`\nstitching -> ${outputPath}`);
  await stitchVideos(videoPaths, outputPath);

  const duration = await getDuration(outputPath);
  log(`done: ${outputPath} (${duration.toFixed(1)}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
