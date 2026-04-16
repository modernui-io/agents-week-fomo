import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, "..", "data", "images");
const ASSETS_DIR = "/Users/z/git/zeke/zekefake/assets";

const API_URL = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_WAIT_MS = 600_000;

function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not set");
  return token;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

async function uploadFile(filePath: string): Promise<string> {
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("content", blob, filePath.split("/").pop()!);

  const resp = await fetch(`${API_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to upload ${filePath}: ${resp.status} ${body}`);
  }

  const data = (await resp.json()) as { urls: { get: string } };
  return data.urls.get;
}

async function createPrediction(input: Record<string, unknown>): Promise<{ id: string }> {
  const resp = await fetch(`${API_URL}/models/google/nano-banana-2/predictions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ input }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to create prediction: ${resp.status} ${body}`);
  }

  return (await resp.json()) as { id: string };
}

async function pollPrediction(id: string): Promise<{ output: string; error: string | null; metrics?: { total_time?: number } }> {
  const start = Date.now();
  while (Date.now() - start < POLL_MAX_WAIT_MS) {
    const resp = await fetch(`${API_URL}/predictions/${id}`, { headers: headers() });
    if (!resp.ok) throw new Error(`Failed to poll ${id}: ${resp.status}`);

    const data = (await resp.json()) as any;
    if (data.status === "succeeded") return data;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Prediction ${id} ${data.status}: ${data.error || "unknown"}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Prediction ${id} timed out`);
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

// Source images
const SOURCE_IMAGES: Record<string, string> = {
  "ziki": join(ASSETS_DIR, "ziki.jpg"),
  "lava-lamps": join(ASSETS_DIR, "zeke-lava-lamps.jpg"),
  "outdoor-selfie": join(ASSETS_DIR, "zeke-outdoor-selfie.jpg"),
  "orange-hat": join(ASSETS_DIR, "zeke-orange-hat.jpg"),
  "wilder-shirt": join(ASSETS_DIR, "zeke-wilder-shirt.jpg"),
  "zeko": join(ASSETS_DIR, "zeko.jpg"),
};

const PERSON_DESC = "a man with curly gray-brown hair, a short beard, and clear-framed glasses";

interface Segment {
  filename: string;
  sourceKey: string;
  prompt: string;
}

const SEGMENTS: Segment[] = [
  {
    filename: "01-intro.jpg",
    sourceKey: "ziki",
    prompt: `Photorealistic photograph of ${PERSON_DESC} sitting at a professional TV news anchor desk in a broadcast studio. The person from the reference image. Dramatic studio lighting, multiple monitors behind him. A news chyron at the bottom of the frame reads "AGENTS WEEK". High production value, clean sharp photograph.`,
  },
  {
    filename: "02-thesis.jpg",
    sourceKey: "outdoor-selfie",
    prompt: `Warm photograph of ${PERSON_DESC} standing in front of a large green chalkboard in a university lecture hall. The person from the reference image. He is gesturing while teaching. The chalkboard has the words "ONE USER = ONE AGENT" written in large chalk letters, with diagrams of arrows and boxes. Soft natural window light, academic atmosphere.`,
  },
  {
    filename: "03-project-think.jpg",
    sourceKey: "wilder-shirt",
    prompt: `Cinematic cyberpunk photograph of ${PERSON_DESC} standing in a neon-lit alley at night. The person from the reference image. He is wearing a dark hoodie with "PROJECT THINK" printed on the chest in glowing cyan text. Rain falling, purple and blue neon reflections on wet pavement, steam rising from grates. Blade Runner aesthetic, high contrast.`,
  },
  {
    filename: "04-sandboxes.jpg",
    sourceKey: "zeko",
    prompt: `Golden hour photograph of ${PERSON_DESC} at an industrial construction site. The person from the reference image. He wears a bright yellow hard hat and a high-vis vest. Behind him, large colorful shipping containers are being stacked by cranes. A huge construction banner reads "SANDBOXES" in bold industrial stencil font. Documentary photography style.`,
  },
  {
    filename: "05-durable-objects.jpg",
    sourceKey: "lava-lamps",
    prompt: `Retro 1980s synthwave photograph of ${PERSON_DESC} in a dark neon-lit arcade. The person from the reference image. Rows of glowing arcade cabinets surround him. The largest cabinet directly behind him has "DURABLE OBJECTS" glowing in pixel font on its marquee. Purple, pink, and cyan neon lighting. Synthwave aesthetic, VHS grain texture.`,
  },
  {
    filename: "06-browser-run.jpg",
    sourceKey: "orange-hat",
    prompt: `Black and white film noir photograph of ${PERSON_DESC} as a 1940s private detective in a dimly lit office. The person from the reference image. He wears a fedora and trench coat. Behind him, a frosted glass office door has "BROWSER RUN" painted on it in reverse. Venetian blind shadows cast dramatic stripes across the scene. High contrast, classic noir cinematography.`,
  },
  {
    filename: "07-voice-agents.jpg",
    sourceKey: "ziki",
    prompt: `Photograph of ${PERSON_DESC} in a professional music recording studio. The person from the reference image. He sits at a large analog mixing console wearing chunky studio headphones. Through the control room glass, microphones are visible. A large studio monitor screen displays "VOICE AGENTS" in clean sans-serif text. Warm amber studio lighting, moody atmosphere.`,
  },
  {
    filename: "08-email-service.jpg",
    sourceKey: "wilder-shirt",
    prompt: `Vintage-toned photograph of ${PERSON_DESC} working behind the counter of a charming old-fashioned post office. The person from the reference image. Wooden mail sorting cubbies cover the wall behind him. He is stamping an envelope. A hand-painted wooden sign above reads "EMAIL SERVICE" in ornate gold lettering. Warm nostalgic color grading, 1950s Americana.`,
  },
  {
    filename: "09-ai-search.jpg",
    sourceKey: "outdoor-selfie",
    prompt: `Fantasy photograph of ${PERSON_DESC} standing in an enormous ancient library with impossibly tall bookshelves stretching into darkness above. The person from the reference image. Golden light streams through high windows. A luminous holographic search bar floats in the air in front of him, displaying the text "AI SEARCH" in glowing blue letters. Magical realism, epic scale.`,
  },
  {
    filename: "10-registrar-api.jpg",
    sourceKey: "zeko",
    prompt: `Sepia-toned Old West photograph of ${PERSON_DESC} standing on a dusty main street of a frontier town. The person from the reference image. He wears a cowboy hat and a duster coat. Behind him, a wooden saloon with swinging doors has a large hand-painted sign reading "REGISTRAR API" above the entrance. Tumbleweeds, wooden boardwalks. Vintage sepia daguerreotype style.`,
  },
  {
    filename: "11-artifacts.jpg",
    sourceKey: "lava-lamps",
    prompt: `Sci-fi photograph of ${PERSON_DESC} floating in a futuristic space station control room. The person from the reference image. He wears a sleek flight suit. Holographic displays surround him showing git branch diagrams and glowing code. A central screen reads "ARTIFACTS" in a futuristic monospaced font. Cool blue and white lighting, zero gravity, stars visible through windows.`,
  },
  {
    filename: "12-ai-platform.jpg",
    sourceKey: "orange-hat",
    prompt: `Andy Warhol pop art style screen print of ${PERSON_DESC}. The person from the reference image. Bold flat colors in a 2x2 grid: top-left in hot pink and yellow, top-right in electric blue and green, bottom-left in orange and purple, bottom-right in red and cyan. The words "AI PLATFORM" are printed across the composition in bold black sans-serif text. High contrast, silk-screen texture.`,
  },
  {
    filename: "13-high-perf-llms.jpg",
    sourceKey: "wilder-shirt",
    prompt: `Photograph of ${PERSON_DESC} standing in a massive data center server room. The person from the reference image. Endless rows of GPU server racks stretch behind him with blinking blue and green LEDs. Cool blue overhead lighting reflects off the polished floor. A wall-mounted sign reads "HIGH PERFORMANCE LLMs" in clean industrial font. Tech-corporate photography, ultra clean.`,
  },
  {
    filename: "14-cf-cli.jpg",
    sourceKey: "ziki",
    prompt: `Dark atmospheric photograph of ${PERSON_DESC} sitting at a desk surrounded by three large monitors in a dimly lit room. The person from the reference image. The screens display green terminal text and code on black backgrounds. The main center monitor prominently shows "CF CLI" in large bright green monospaced font. The only light source is the monitors casting a green glow on his face. Hacker aesthetic, Mr Robot style.`,
  },
  {
    filename: "15-oauth-mesh.jpg",
    sourceKey: "outdoor-selfie",
    prompt: `Architectural photograph of ${PERSON_DESC} examining a massive technical blueprint mounted on a wall. The person from the reference image. The blueprint shows network topology diagrams with nodes and connections drawn in white lines on deep blue paper. The word "MESH" appears in large blueprint-style uppercase lettering. He holds a compass tool. Technical, precise, drafting room atmosphere.`,
  },
  {
    filename: "16-closer.jpg",
    sourceKey: "zeko",
    prompt: `Cinematic photograph of ${PERSON_DESC} walking away from the camera down a long minimalist concrete hallway. The person from the reference image. Dramatic backlighting creates a silhouette effect. On the wall to his right, the word "SURVIVED." is projected in enormous white letters. Architectural, dramatic, film still composition. Aspect ratio 16:9, widescreen cinematic.`,
  },
];

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });

  console.log("Uploading source images to Replicate...");

  // Upload unique source images
  const uploadedUrls = new Map<string, string>();
  const uniqueKeys = [...new Set(SEGMENTS.map((s) => s.sourceKey))];

  for (const key of uniqueKeys) {
    const path = SOURCE_IMAGES[key];
    console.log(`  uploading ${key}...`);
    const url = await uploadFile(path);
    uploadedUrls.set(key, url);
  }
  console.log(`Uploaded ${uploadedUrls.size} source images\n`);

  // Fire all 16 predictions concurrently
  console.log("Creating 16 predictions concurrently...");
  const pending = SEGMENTS.map(async (seg, i) => {
    const imageUrl = uploadedUrls.get(seg.sourceKey)!;
    try {
      const pred = await createPrediction({
        prompt: seg.prompt,
        image_input: [imageUrl],
        aspect_ratio: "16:9",
        output_format: "jpg",
      });
      console.log(`  [${String(i + 1).padStart(2)}] ${seg.filename} -> prediction ${pred.id}`);
      return { seg, predId: pred.id, index: i };
    } catch (err: any) {
      console.error(`  [${String(i + 1).padStart(2)}] ${seg.filename} FAILED to create: ${err.message}`);
      return null;
    }
  });

  const created = (await Promise.all(pending)).filter(Boolean) as Array<{
    seg: Segment;
    predId: string;
    index: number;
  }>;

  console.log(`\n${created.length} predictions created. Polling...\n`);

  // Poll all predictions concurrently
  const results = await Promise.all(
    created.map(async ({ seg, predId, index }) => {
      try {
        const result = await pollPrediction(predId);
        const time = result.metrics?.total_time;
        console.log(`  [${String(index + 1).padStart(2)}] ${seg.filename} done${time ? ` (${time.toFixed(0)}s)` : ""}`);
        return { seg, output: result.output as string, index };
      } catch (err: any) {
        console.error(`  [${String(index + 1).padStart(2)}] ${seg.filename} FAILED: ${err.message}`);
        return null;
      }
    })
  );

  // Download all completed images
  console.log("\nDownloading images...");
  let downloaded = 0;
  for (const r of results.filter(Boolean) as Array<{ seg: Segment; output: string; index: number }>) {
    const outPath = join(IMAGES_DIR, r.seg.filename);
    await downloadFile(r.output, outPath);
    downloaded++;
    console.log(`  [${String(r.index + 1).padStart(2)}] ${r.seg.filename} saved`);
  }

  console.log(`\nDone. ${downloaded}/${SEGMENTS.length} images saved to data/images/`);
}

main().catch(console.error);
