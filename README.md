## Agents Week FOMO

A 4-minute deepfake video summarizing everything Cloudflare shipped during [Agents Week](https://blog.cloudflare.com/welcome-to-agents-week/) (April 2026). Twenty blog posts in five days. Too much to keep up with, so I deployed a deepfake version of myself to give you the scoop.

## How this was made

This entire project was built in a single [OpenCode](https://opencode.ai) session. Here's the story.

### The idea

It's Thursday of Agents Week. Cloudflare has shipped twenty blog posts in four days and I'm drowning. The idea: use AI tooling to collect everything that shipped, write a script, generate images and video, and publish a recap, all from one CLI session.

### Step 1: Collect the data

First, we scraped the [Cloudflare blog](https://blog.cloudflare.com/tag/agents-week/) and downloaded all 20 Agents Week blog posts as markdown files. Full text, frontmatter with titles and authors, the works.

Then we needed the social media angle. We set up X API credentials at [console.x.com](https://console.x.com), purchased $10 in pay-per-use credits, and built a script to find Cloudflare employees on X. We scrolled through my [@zeke](https://x.com/zeke) following list using Chrome DevTools MCP, extracting every account with "cloudflare" in their bio. That gave us 87 handles. Then we hit the X API to pull the last 5 days of tweets from all of them: 644 tweets, sorted by engagement.

### Step 2: Write the script

We analyzed the blog posts and tweets to understand what shipped, grouped the announcements into themes, and picked the most quotable tweets. Then we drafted a 16-paragraph script, one paragraph per video segment. Each one covers a specific product launch.

The script went through several rounds of editing. We rewrote the intro to establish the deepfake-as-narrator framing ("Zeke couldn't keep up, so he deployed me as his deepfake to give you the scoop"). We tightened the thesis paragraph, broke up run-on sentences in the Project Think section, and workshopped the closer until we landed on a Ron Burgundy sign-off: "You stay classy, developers."

### Step 3: Generate the images

Each of the 16 segments needed a unique visual backdrop. We used [google/nano-banana-2](https://replicate.com/google/nano-banana-2) on Replicate to generate 16:9 images, each one placing me in a different scene with the product name worked into the environment:

- News anchor desk with "AGENTS WEEK" on the chyron
- University lecture hall with "ONE USER = ONE AGENT" on the chalkboard
- Cyberpunk neon alley with "PROJECT THINK" on a hoodie
- Construction site with "SANDBOXES" on a banner
- 80s synthwave arcade with "DURABLE OBJECTS" on a cabinet
- Film noir detective office with "BROWSER RUN" on frosted glass
- Recording studio with "VOICE AGENTS" on a monitor
- 1950s post office with "EMAIL SERVICE" on a sign
- Ancient library with "AI SEARCH" as a holographic search bar
- Wild West saloon with "REGISTRAR API" on the sign
- Sci-fi space station with "ARTIFACTS" on a screen
- Warhol pop art grid with "AI PLATFORM" across it
- Server room with "HIGH PERFORMANCE LLMs" on the wall
- Hacker terminal setup with "CF CLI" on the screen
- Blueprint drafting table with "MESH" in technical lettering
- Back at the news desk with "SURVIVED." on the monitors

All 16 images were generated concurrently in about 30 seconds total. We iterated on a few that didn't look right (the pop art one, the Western, the library) by re-running them with the same prompts until the likeness was better.

### Step 4: Generate audio and video

We built a custom pipeline (inspired by [zekefake](https://github.com/zeke/zekefake)) that:

1. Splits the script into 16 paragraphs
2. Generates TTS audio for each using [minimax/speech-2.8-hd](https://replicate.com/minimax/speech-2.8-hd) with a cloned voice
3. Generates talking-head video for each using [veed/fabric-1.0](https://replicate.com/veed/fabric-1.0) with the matching generated image + audio
4. Normalizes all videos to 1280x720 25fps with ffmpeg
5. Replaces audio tracks with clean TTS
6. Saves individual segment videos so we can iterate

All 16 audio and video segments run concurrently on Replicate. The full pipeline takes about 10 minutes and costs about $2.

### Step 5: Stitch and publish

Once all segments looked good, we stitched them into one video with ffmpeg concat. Then we used the [Typefully API](https://typefully.com/docs/api) to draft a 16-tweet thread on X, with the video on the first tweet and links to relevant blog posts and employee tweets on each subsequent post.

### The tools

Everything was orchestrated from a single OpenCode session:

- [OpenCode](https://opencode.ai) for the entire workflow: writing code, running scripts, browsing the web, managing files
- [Replicate](https://replicate.com) for image generation (nano-banana-2), voice cloning and TTS (minimax/speech-2.8-hd), and video generation (veed/fabric-1.0)
- [X API](https://console.x.com) for fetching tweets from Cloudflare employees
- [Typefully API](https://typefully.com/docs/api) for drafting the tweet thread
- [Chrome DevTools MCP](https://github.com/anthropics/anthropic-devtools-mcp) for scrolling through X following lists and setting up API credentials
- ffmpeg for video normalization, audio replacement, and stitching
- cheerio for HTML parsing when scraping blog posts

### Cost

| Item | Cost |
| ---- | ---- |
| X API credits | $10.00 |
| Image generation (16x nano-banana-2, plus redos) | ~$0.75 |
| TTS audio (16x minimax/speech-2.8-hd) | ~$0.16 |
| Video generation (16x veed/fabric-1.0) | ~$1.60 |
| Total | ~$12.50 |

## Project structure

```
agents-week-fomo/
  script.md                  # The 16-paragraph script
  PLAN.md                    # Production plan
  output.mp4                 # Final stitched video
  src/
    pipeline.ts              # Main video pipeline
    stitch.ts                # Concat segments into one video
    generate-images.ts       # Generate segment images via Replicate
    create-thread.ts         # Upload video + create Typefully draft
    fetch-tweets.ts          # Fetch tweets from CF employees via X API
    fetch-blogs.ts           # Fetch blog post metadata
    download-blogs.ts        # Download full blog posts as markdown
    collect-handles.ts       # Collect CF employee X handles
    replicate-helpers.ts     # Replicate API helpers
    ffmpeg.ts                # ffmpeg helpers
    index.ts                 # Run all data collection
  data/
    images/                  # 16 generated segment images (16:9)
    videos/                  # 16 individual segment videos
    blogs/                   # 20 Agents Week blog posts as markdown
    tweets.json              # 644 tweets from 88 CF accounts
    handles.json             # 87 CF employee X handles
    blogs.json               # Blog post metadata
```

## Running it yourself

```bash
npm install

# Data collection
npm run handles            # Collect CF employee X handles
npm run tweets             # Fetch tweets (needs X_BEARER_TOKEN in .env)
npm run download-blogs     # Download blog posts as markdown

# Image + video generation (needs REPLICATE_API_TOKEN)
npm run images             # Generate 16 segment images
npm run pipeline           # Generate audio + video for all segments
npx tsx src/pipeline.ts 5  # Re-run a single segment (1-indexed)
npm run stitch             # Stitch all segments into output.mp4

# Publishing (needs TYPEFULLY_API_KEY in .env)
npm run thread             # Create Typefully draft thread
```

## The script

The full script that the deepfake reads:

---

> It's Agents Week at Cloudflare. The week's not over yet, but there's already too much to keep up with. Zeke couldn't keep up, so he deployed me as his deepfake to give you the scoop. Let's cover the highlights.
>
> Here's the thing about agents. Every traditional app serves many users from one server. Agents flip that. One user, one agent, one task. Scale that to millions of people and you need millions of simultaneous sessions. Containers can't do that. Not at a price anyone would pay. So Cloudflare built something different.
>
> Project Think is the next version of the Agents SDK. Your agent can crash and recover. It can hibernate when idle and cost you nothing. It can spawn sub-agents and escalate from a lightweight isolate to a full container when it needs one. Ten thousand agents on containers means ten thousand always-on instances. On Durable Objects, maybe a hundred are active at any moment. That's the difference.
>
> Sandboxes are now generally available to everyone. Your agent gets a real computer: terminal, code interpreter, live preview URLs, secure credential injection. Figma is already using them for Figma Make.
>
> Durable Objects got Facets. That means every AI-generated app can have its own SQLite database, supervised by your code. If you're building a platform where users can vibe-code their own apps, each app gets its own isolated state.
>
> Browser Run lets your agent control a headless browser with a live view. If the agent gets stuck on a login page, it hands off to a human, the human logs in, the agent picks back up. You get session recordings, direct CDP access, and support for up to 120 concurrent browser sessions.
>
> Voice agents got a new SDK. Wrap any agent class with withVoice and it can hear and speak in real time over WebSocket. Built-in speech-to-text and text-to-speech providers, React hooks included.
>
> The Cloudflare Email Service entered public beta. Agents can send and receive email natively from Workers. There's an onEmail hook in the Agents SDK, so your agent can receive a message, do hours of background work, and reply when it's done.
>
> AI Search shipped as a retrieval primitive. Create search instances on the fly, upload documents, and query with hybrid semantic and keyword search. One binding, built-in storage and vector index, no external services needed.
>
> The Registrar API is now in beta. Agents can search for available domains, check pricing, and register them programmatically. Three API calls, a few seconds. It's already wired into the Cloudflare MCP server.
>
> Artifacts is a versioned filesystem that speaks Git. Create a repo per agent session, fork sessions, time-travel through state. Import from GitHub, clone with standard Git tools. It's built on Durable Objects and it's heading to public beta next month.
>
> The AI platform unified seventy-plus models from twelve providers behind one API and one bill. The Replicate team is now fully merged into Cloudflare. You can bring your own model via Cog. And AI Gateway now buffers streaming responses, so if your agent crashes mid-stream, it can reconnect without re-paying for the inference.
>
> Cloudflare built a custom inference engine in Rust and shipped prefill-decode disaggregation, speculative decoding, and cross-GPU KV-cache sharing. The result: large language models that are fast enough for real-time agent loops, running on Cloudflare's own GPU fleet.
>
> There's a new unified CLI. Run npx cf to manage any Cloudflare product from your terminal. It's backed by a new TypeScript schema system that generates CLI commands, config, bindings, and docs from a single source. Plus a local explorer that lets you inspect your local dev state for KV, R2, D1, Durable Objects, and Workflows.
>
> Managed OAuth lets you flip a switch and make any internal app behind Cloudflare Access agent-ready, no code changes. And Cloudflare Mesh wires up private networking between your devices, servers, agents, and Workers, so everything can talk to each other securely without a VPN.
>
> That's twenty blog posts and it's only Thursday. One more day to go. I'm Zeke's deepfake. You stay classy, developers. And good luck keeping up.
