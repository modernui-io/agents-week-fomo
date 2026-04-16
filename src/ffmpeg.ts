import { execFile } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";

const execFileAsync = promisify(execFile);

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const TARGET_FPS = 25;

export async function checkFfmpeg(): Promise<void> {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
  } catch {
    throw new Error("ffmpeg not found on PATH. Install it first.");
  }
}

export async function getDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

/**
 * Normalize a video to target resolution and fps.
 * Scales and pads to fit exactly TARGET_WIDTH x TARGET_HEIGHT.
 */
export async function normalizeVideo(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", inputPath,
    "-vf", `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,fps=${TARGET_FPS}`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-movflags", "+faststart",
    outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 });
}

/**
 * Replace the audio track of a video with a separate audio file.
 * The video is trimmed/extended to match the audio duration.
 */
export async function replaceAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", videoPath,
    "-i", audioPath,
    "-c:v", "copy",
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 });
}

/**
 * Stitch multiple video files into one using concat demuxer.
 */
export async function stitchVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  // Write concat list file
  const listPath = outputPath + ".list.txt";
  const listContent = videoPaths.map((p) => `file '${p}'`).join("\n");
  writeFileSync(listPath, listContent);

  await execFileAsync("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", listPath,
    "-c", "copy",
    "-movflags", "+faststart",
    outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 });
}
