import { TwitterApi } from "twitter-api-v2";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

interface HandleEntry {
  handle: string;
  displayName: string;
  bio: string;
}

export interface TweetResult {
  id: string;
  text: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
  url: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
}

// 5 days ago from now
function fiveDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchTweets(): Promise<TweetResult[]> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    console.error("X_BEARER_TOKEN not set in .env file.");
    console.error("Get one at https://console.x.com/");
    return [];
  }

  const client = new TwitterApi(bearerToken);

  // Load handles
  const handlesPath = join(DATA_DIR, "handles.json");
  if (!existsSync(handlesPath)) {
    console.error("handles.json not found in data/");
    return [];
  }
  const handles: HandleEntry[] = JSON.parse(readFileSync(handlesPath, "utf-8"));

  // Filter to individual accounts (skip bot/status/regional accounts that rarely post interesting content)
  const skipHandles = new Set([
    "cloudflaresys", "cloudflaretv", "cloudflarejobs", "1111resolver",
    "cloudflareabuse", "cloudflarehelp", "cloudflare_jp", "cloudflare_es",
    "cloudflare_br", "cloudflare_de", "cloudflare_lat", "cloudflarelove",
  ]);
  const activeHandles = handles.filter((h) => !skipHandles.has(h.handle.toLowerCase()));

  console.log(`Fetching last 5 days of tweets from ${activeHandles.length} accounts...`);
  console.log(`Start time: ${fiveDaysAgo()}\n`);

  const allTweets: TweetResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  // First, look up all user IDs in batches of 100
  console.log("Looking up user IDs...");
  const handleToId = new Map<string, string>();
  const handleToName = new Map<string, string>();

  const usernameBatches: string[][] = [];
  for (let i = 0; i < activeHandles.length; i += 100) {
    usernameBatches.push(activeHandles.slice(i, i + 100).map((h) => h.handle));
  }

  for (const batch of usernameBatches) {
    try {
      const users = await client.v2.usersByUsernames(batch, {
        "user.fields": ["id", "username", "name"],
      });
      if (users.data) {
        for (const user of users.data) {
          handleToId.set(user.username.toLowerCase(), user.id);
          handleToName.set(user.username.toLowerCase(), user.name);
        }
      }
      console.log(`  Resolved ${handleToId.size} users so far`);
    } catch (err: any) {
      console.error(`  User lookup error: ${err?.message || err}`);
    }
    await sleep(500);
  }

  console.log(`Resolved ${handleToId.size}/${activeHandles.length} user IDs\n`);

  // Now fetch timelines for each user
  const startTime = fiveDaysAgo();
  let i = 0;

  for (const entry of activeHandles) {
    i++;
    const key = entry.handle.toLowerCase();
    const userId = handleToId.get(key);

    if (!userId) {
      console.log(`  [${i}/${activeHandles.length}] @${entry.handle} - ID not found, skipping`);
      errorCount++;
      continue;
    }

    try {
      const timeline = await client.v2.userTimeline(userId, {
        max_results: 100,
        start_time: startTime,
        exclude: ["replies"],
        "tweet.fields": ["created_at", "public_metrics", "author_id", "referenced_tweets"],
      });

      let tweetCount = 0;
      if (timeline.data?.data) {
        for (const tweet of timeline.data.data) {
          // Skip pure retweets
          const isRetweet = tweet.referenced_tweets?.some((r) => r.type === "retweeted");
          if (isRetweet) continue;

          allTweets.push({
            id: tweet.id,
            text: tweet.text,
            authorHandle: entry.handle,
            authorName: handleToName.get(key) || entry.displayName,
            createdAt: tweet.created_at || "",
            url: `https://x.com/${entry.handle}/status/${tweet.id}`,
            metrics: {
              likes: tweet.public_metrics?.like_count || 0,
              retweets: tweet.public_metrics?.retweet_count || 0,
              replies: tweet.public_metrics?.reply_count || 0,
              impressions: tweet.public_metrics?.impression_count || 0,
            },
          });
          tweetCount++;
        }
      }

      console.log(`  [${i}/${activeHandles.length}] @${entry.handle} - ${tweetCount} tweets`);
      successCount++;
    } catch (err: any) {
      if (err?.code === 429) {
        console.error(`  [${i}/${activeHandles.length}] @${entry.handle} - rate limited, waiting 60s...`);
        await sleep(60000);
        i--; // retry
        continue;
      }
      console.error(`  [${i}/${activeHandles.length}] @${entry.handle} - error: ${err?.message || err}`);
      errorCount++;
    }

    // Respect rate limits: user timeline is 900 requests per 15 min = 1 per second
    await sleep(1100);
  }

  // Sort by engagement
  allTweets.sort((a, b) => {
    const engA = a.metrics.likes + a.metrics.retweets;
    const engB = b.metrics.likes + b.metrics.retweets;
    return engB - engA;
  });

  console.log(`\nDone. ${successCount} accounts fetched, ${errorCount} errors.`);
  console.log(`Total tweets (excluding retweets and replies): ${allTweets.length}`);
  return allTweets;
}

async function main() {
  const tweets = await fetchTweets();

  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, "tweets.json");
  writeFileSync(outPath, JSON.stringify(tweets, null, 2));
  console.log(`\nWrote ${tweets.length} tweets to ${outPath}`);

  // Print top tweets
  if (tweets.length > 0) {
    console.log("\nTop 15 tweets by engagement:");
    for (const tweet of tweets.slice(0, 15)) {
      const eng = tweet.metrics.likes + tweet.metrics.retweets;
      console.log(`\n  [${eng} eng] @${tweet.authorHandle}:`);
      console.log(`  ${tweet.text.slice(0, 140)}${tweet.text.length > 140 ? "..." : ""}`);
      console.log(`  ${tweet.url}`);
    }
  }
}

main().catch(console.error);
