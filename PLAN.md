## Agents Week FOMO Report

A deepfake video report covering Cloudflare's Agents Week (April 2026). 16 segments, each with a unique visual style, stitched into one ~4 minute video.

## Data collection

- Downloaded 20 Agents Week blog posts as markdown (`data/blogs/`)
- Collected 87 Cloudflare employee X handles (`data/handles.json`)
- Fetched 644 tweets from those accounts over the last 5 days (`data/tweets.json`)

## Script

`script.md` contains 16 paragraphs, one per video segment:

| # | Topic | Image style |
|---|-------|-------------|
| 1 | Intro: Agents Week, deepfake framing | News anchor desk |
| 2 | Thesis: agents are one-to-one | Chalkboard lecture |
| 3 | Project Think: Agents SDK v2 | Cyberpunk neon alley |
| 4 | Sandboxes GA | Construction site |
| 5 | Durable Object Facets | 80s synthwave arcade |
| 6 | Browser Run | Film noir B&W |
| 7 | Voice Agents | Recording studio |
| 8 | Email Service | 1950s post office |
| 9 | AI Search | Ancient library |
| 10 | Registrar API | Wild West sepia |
| 11 | Artifacts | Sci-fi space station |
| 12 | AI Platform | Warhol pop art |
| 13 | High-Performance LLMs | Server room close-up |
| 14 | CF CLI | Hacker terminal |
| 15 | Managed OAuth + Mesh | Blueprint drafting |
| 16 | Closer: Ron Burgundy sign-off | News anchor desk (matching #1) |

## Image generation

- Model: `google/nano-banana-2` on Replicate
- Input: one zekefake reference photo per segment + descriptive prompt
- Output: 16:9 JPGs in `data/images/`
- Script: `npm run images` (or `src/generate-images.ts`)

## Video pipeline

### Step 1: TTS audio
- Model: `minimax/speech-2.8-hd`
- Voice: cloned voice ID `R8_JURR4DHK`
- All 16 segments generated concurrently

### Step 2: Talking-head video
- Model: `veed/fabric-1.0`
- Input: generated image + TTS audio per segment
- All 16 segments generated concurrently

### Step 3: Normalize + replace audio
- ffmpeg normalizes each video to 1280x720 25fps
- ffmpeg replaces the video's audio with the clean TTS track
- Output: individual segment MP4s in `data/videos/`

### Step 4: Stitch
- ffmpeg concat demuxer joins all 16 segments
- Output: `output.mp4`

## Commands

```bash
npm run images          # Generate all 16 segment images
npm run pipeline        # Run full pipeline (audio + video + normalize)
npx tsx src/pipeline.ts 3 7 16  # Re-run specific segments (1-indexed)
npm run stitch          # Stitch segments into output.mp4
```

## Iterating on individual segments

The pipeline outputs individual MP4s to `data/videos/`. To redo a segment:

1. Re-run just that segment: `npx tsx src/pipeline.ts 5`
2. Preview the result: `open data/videos/05-durable-objects.mp4`
3. When all segments look good: `npm run stitch`

## Cost estimates

- Image generation: 16 x ~$0.03 = ~$0.50
- TTS audio: 16 x ~$0.01 = ~$0.16
- Video generation: 16 x ~$0.10 = ~$1.60
- Total per full pipeline run: ~$2.25
- Per-segment redo: ~$0.14
