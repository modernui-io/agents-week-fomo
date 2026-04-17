import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const API_URL = "https://api.typefully.com/v2";
const API_KEY = process.env.TYPEFULLY_API_KEY;
if (!API_KEY) throw new Error("TYPEFULLY_API_KEY env var is required");
const SOCIAL_SET_ID = "104693";
const VIDEO_PATH = join(ROOT, "output.mp4");

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
}

function log(msg: string) {
  process.stderr.write(`${msg}\n`);
}

// --- Media upload (presigned URL flow) ---

async function uploadVideo(filePath: string): Promise<string> {
  log("requesting upload URL...");
  const resp = await fetch(`${API_URL}/social-sets/${SOCIAL_SET_ID}/media/upload`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ file_name: "agents-week-fomo.mp4" }),
  });

  if (!resp.ok) {
    throw new Error(`Failed to request upload URL: ${resp.status} ${await resp.text()}`);
  }

  const { media_id, upload_url } = (await resp.json()) as { media_id: string; upload_url: string };
  log(`media_id: ${media_id}`);

  // PUT raw bytes to presigned URL (no extra headers!)
  log("uploading video (43MB)...");
  const fileBuffer = readFileSync(filePath);
  const putResp = await fetch(upload_url, {
    method: "PUT",
    body: fileBuffer,
  });

  if (!putResp.ok && putResp.status !== 204) {
    throw new Error(`Failed to upload to S3: ${putResp.status}`);
  }
  log("upload complete, waiting for processing...");

  // Poll until ready
  let attempts = 0;
  while (attempts < 120) {
    const statusResp = await fetch(`${API_URL}/social-sets/${SOCIAL_SET_ID}/media/${media_id}`, {
      headers: headers(),
    });
    if (!statusResp.ok) throw new Error(`Failed to check media status: ${statusResp.status}`);

    const data = (await statusResp.json()) as { status: string; error_reason?: string };
    if (data.status === "ready") {
      log("video is ready");
      return media_id;
    }
    if (data.status === "failed") {
      throw new Error(`Video processing failed: ${data.error_reason}`);
    }

    log(`  status: ${data.status} (attempt ${attempts + 1})...`);
    await new Promise((r) => setTimeout(r, 5000));
    attempts++;
  }

  throw new Error("Video processing timed out");
}

// --- Thread content ---

const GITHUB_REPO = "https://github.com/zeke/agents-week-fomo";

interface ThreadPost {
  text: string;
  media_ids?: string[];
}

function buildThread(videoMediaId: string): ThreadPost[] {
  return [
    {
      text: `It's Agents Week at @Cloudflare. Too much shipped to keep up with, so I made a deepfake of myself to cover the highlights. Here's the 4-minute recap.

https://blog.cloudflare.com/welcome-to-agents-week/`,
      media_ids: [videoMediaId],
    },
    {
      text: `2/16 Agents flip the traditional app model. One user, one agent, one task. Containers can't scale that at any reasonable price. So @Cloudflare built something different.

https://blog.cloudflare.com/welcome-to-agents-week/
https://x.com/dok2001/status/2043380655770239062`,
    },
    {
      text: `3/16 Project Think: Agents SDK v2. Crash recovery, zero-cost hibernation, sub-agents, and an execution ladder from isolates to full containers.

https://blog.cloudflare.com/project-think/
https://x.com/whoiskatrin/status/2044415568627847671`,
    },
    {
      text: `4/16 Sandboxes are now GA. Your agent gets a real computer: terminal, code interpreter, live preview URLs, secure credential injection. Figma is already using them.

https://blog.cloudflare.com/sandbox-ga/
https://x.com/whoiskatrin/status/2043689502510580118`,
    },
    {
      text: `5/16 Durable Object Facets: every AI-generated app gets its own SQLite database, supervised by your code.

https://blog.cloudflare.com/durable-object-facets-dynamic-workers/
https://x.com/KentonVarda/status/2043684025454170438`,
    },
    {
      text: `6/16 Browser Run: agents get a headless browser with live view. Gets stuck on a login page? Hands off to a human, human logs in, agent resumes.

https://blog.cloudflare.com/browser-run-for-ai-agents/
https://x.com/celso/status/2044417682661933381`,
    },
    {
      text: `7/16 Voice agents SDK: wrap any agent class with withVoice and it can hear and speak in real time over WebSocket.

https://blog.cloudflare.com/voice-agents/
https://x.com/whoiskatrin/status/2044498618317418601`,
    },
    {
      text: `8/16 Cloudflare Email Service in public beta. Agents send and receive email natively from Workers. onEmail hook in the Agents SDK.

https://blog.cloudflare.com/email-for-agents/
https://x.com/thomasgauvin/status/2044766954032951792`,
    },
    {
      text: `9/16 AI Search: retrieval primitive for agents. Hybrid semantic + keyword search, built-in storage and vector index. One binding, no external services.

https://blog.cloudflare.com/ai-search-agent-primitive/
https://x.com/aninibread/status/2044773045772959944`,
    },
    {
      text: `10/16 Registrar API in beta. Agents can search, price, and register domains. Three API calls, a few seconds. Already wired into the Cloudflare MCP server.

https://blog.cloudflare.com/registrar-api-beta/`,
    },
    {
      text: `11/16 Artifacts: a versioned filesystem that speaks Git. One repo per agent session, with forking and time travel.

https://blog.cloudflare.com/artifacts-git-for-agents-beta/
https://x.com/dillon_mulroy/status/2044765430649168272`,
    },
    {
      text: `12/16 Unified AI platform: 70+ models from 12 providers, one API, one bill. Replicate team fully merged into @Cloudflare. Bring your own model via Cog.

https://blog.cloudflare.com/ai-platform/
https://x.com/ritakozlov/status/2044771567800865210`,
    },
    {
      text: `13/16 Custom Rust inference engine with prefill-decode disaggregation, speculative decoding, and cross-GPU KV-cache sharing. Large models at real-time speed.

https://blog.cloudflare.com/high-performance-llms/
https://x.com/ritakozlov/status/2044768407346688044`,
    },
    {
      text: `14/16 New unified CLI: npx cf. One command for every Cloudflare product. Plus a local explorer for KV, R2, D1, Durable Objects, and Workflows.

https://blog.cloudflare.com/cf-cli-local-explorer/
https://x.com/_ashleypeacock/status/2043707612907086041`,
    },
    {
      text: `15/16 Managed OAuth: one click to make internal apps agent-ready. Cloudflare Mesh: private networking between devices, servers, agents, and Workers.

https://blog.cloudflare.com/managed-oauth-for-access/
https://x.com/irvinebroque/status/2044049522746339728`,
    },
    {
      text: `16/16 That's 20 blog posts and it's only Thursday. One more day to go. You stay classy, developers. And good luck keeping up.

Check out this repo to see how this sausage was made: ${GITHUB_REPO}

https://x.com/eastdakota/status/2044644368603398648`,
    },
  ];
}

// --- Create the draft ---

async function createDraft(posts: ThreadPost[]): Promise<{ id: number; private_url: string }> {
  const body = {
    platforms: {
      x: {
        enabled: true,
        posts: posts.map((p) => ({
          text: p.text,
          media_ids: p.media_ids || [],
          quote_post_url: null,
        })),
      },
    },
    draft_title: "Agents Week FOMO Report",
  };

  const resp = await fetch(`${API_URL}/social-sets/${SOCIAL_SET_ID}/drafts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to create draft: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { id: number; private_url: string };
  return data;
}

// --- Main ---

async function main() {
  if (!existsSync(VIDEO_PATH)) {
    throw new Error(`Video not found: ${VIDEO_PATH}. Run 'npm run stitch' first.`);
  }

  // Step 1: Upload video
  log("=== Step 1: Upload video ===");
  const mediaId = await uploadVideo(VIDEO_PATH);

  // Step 2: Build thread
  log("\n=== Step 2: Build thread ===");
  const posts = buildThread(mediaId);
  log(`${posts.length} posts in thread`);

  // Validate tweet lengths
  for (let i = 0; i < posts.length; i++) {
    const charCount = posts[i].text.length;
    if (charCount > 280) {
      log(`  WARNING: post ${i + 1} is ${charCount} chars (over 280 limit)`);
    } else {
      log(`  post ${i + 1}: ${charCount} chars`);
    }
  }

  // Step 3: Create draft
  log("\n=== Step 3: Create draft ===");
  const draft = await createDraft(posts);
  log(`draft created: ${draft.private_url}`);

  // Step 4: Open in browser
  const { execSync } = await import("child_process");
  execSync(`open "${draft.private_url}"`);

  log("\nDone. Review the draft in Typefully, then publish when ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
