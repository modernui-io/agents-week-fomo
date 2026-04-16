import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { collectHandles, type Handle } from "./collect-handles.js";
import { fetchBlogs, type BlogPost } from "./fetch-blogs.js";
import { fetchTweets, type TweetResult } from "./fetch-tweets.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

interface Output {
  generatedAt: string;
  summary: {
    totalHandles: number;
    totalBlogPosts: number;
    totalTweets: number;
    topTweeters: Array<{ handle: string; name: string; tweetCount: number }>;
  };
  handles: Handle[];
  blogs: BlogPost[];
  tweets: TweetResult[];
}

async function main() {
  console.log("=== Agents Week FOMO Aggregator ===\n");

  // Step 1: Collect handles
  console.log("--- Step 1: Collecting handles ---");
  const handles = await collectHandles();
  console.log();

  // Step 2: Fetch blog posts
  console.log("--- Step 2: Fetching blog posts ---");
  const blogs = await fetchBlogs();
  console.log();

  // Step 3: Fetch tweets (requires X_BEARER_TOKEN)
  console.log("--- Step 3: Fetching tweets ---");
  const tweets = await fetchTweets();
  console.log();

  // Compute top tweeters
  const tweetCountByHandle = new Map<string, number>();
  for (const t of tweets) {
    const key = t.authorHandle.toLowerCase();
    tweetCountByHandle.set(key, (tweetCountByHandle.get(key) || 0) + 1);
  }
  const topTweeters = [...tweetCountByHandle.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([handle, count]) => {
      const h = handles.find((h) => h.handle.toLowerCase() === handle);
      return { handle, name: h?.name || handle, tweetCount: count };
    });

  // Build output
  const output: Output = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalHandles: handles.length,
      totalBlogPosts: blogs.length,
      totalTweets: tweets.length,
      topTweeters,
    },
    handles,
    blogs,
    tweets,
  };

  mkdirSync(DATA_DIR, { recursive: true });

  // Write individual files
  writeFileSync(join(DATA_DIR, "handles.json"), JSON.stringify(handles, null, 2));
  writeFileSync(join(DATA_DIR, "blogs.json"), JSON.stringify(blogs, null, 2));
  writeFileSync(join(DATA_DIR, "tweets.json"), JSON.stringify(tweets, null, 2));

  // Write combined output
  const outPath = join(DATA_DIR, "output.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  // Print summary
  console.log("=== Summary ===");
  console.log(`Handles:    ${handles.length}`);
  console.log(`Blog posts: ${blogs.length}`);
  console.log(`Tweets:     ${tweets.length}`);
  if (topTweeters.length > 0) {
    console.log("\nTop tweeters:");
    for (const t of topTweeters) {
      console.log(`  @${t.handle}: ${t.tweetCount} tweets`);
    }
  }
  console.log(`\nOutput written to ${outPath}`);
}

main().catch(console.error);
