/**
 * Extract frames from a Jira repro video for vision analysis.
 *
 * Usage:
 *   node scripts/jira-extract-video-frames.mjs path/to/video.mp4 --interval 5 --max-frames 20
 *
 * Requires ffmpeg on PATH.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  const videoPath = args.find((a) => !a.startsWith("--"));
  if (!videoPath) {
    console.error(
      "Usage: node scripts/jira-extract-video-frames.mjs <video-path> [--interval 5] [--max-frames 20]",
    );
    process.exit(1);
  }

  const getNum = (flag, fallback) => {
    const i = args.indexOf(flag);
    if (i === -1 || i + 1 >= args.length) return fallback;
    const n = Number(args[i + 1]);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    videoPath: path.isAbsolute(videoPath) ? videoPath : path.resolve(process.cwd(), videoPath),
    interval: getNum("--interval", 5),
    maxFrames: getNum("--max-frames", 20),
  };
}

function hasFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", shell: process.platform === "win32" });
  return r.status === 0;
}

function main() {
  const { videoPath, interval, maxFrames } = parseArgs(process.argv);

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    process.exit(1);
  }

  if (!hasFfmpeg()) {
    console.error(
      "ffmpeg not found on PATH. Install ffmpeg and retry, or rely on Jira text/images only.\n" +
        "Windows: winget install ffmpeg  OR  choco install ffmpeg",
    );
    process.exit(1);
  }

  const intakeRoot = path.dirname(path.dirname(videoPath));
  const framesDir = path.join(intakeRoot, "frames");
  fs.mkdirSync(framesDir, { recursive: true });

  const pattern = path.join(framesDir, "frame-%03d.png");
  const fps = 1 / interval;

  console.log(`Extracting frames every ${interval}s (max ${maxFrames}) from ${path.basename(videoPath)}`);

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      videoPath,
      "-vf",
      `fps=${fps}`,
      "-frames:v",
      String(maxFrames),
      pattern,
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "ffmpeg failed");
    process.exit(1);
  }

  const frames = fs
    .readdirSync(framesDir)
    .filter((f) => f.startsWith("frame-") && f.endsWith(".png"))
    .sort()
    .map((filename) => ({
      filename,
      path: path.relative(ROOT, path.join(framesDir, filename)).replace(/\\/g, "/"),
    }));

  const manifest = {
    sourceVideo: path.relative(ROOT, videoPath).replace(/\\/g, "/"),
    intervalSeconds: interval,
    maxFrames,
    extractedAt: new Date().toISOString(),
    frames,
  };

  const manifestPath = path.join(framesDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Extracted ${frames.length} frame(s) → ${path.relative(ROOT, framesDir)}`);
  console.log(`Manifest: ${path.relative(ROOT, manifestPath)}`);
}

main();
