import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

export interface Handle {
  handle: string;
  name: string;
  bio: string;
  source: string[];
}

// Curated seed list from blog post authors + @zeke's following list scrape
const SEED_HANDLES: Handle[] = [
  // Official accounts
  { handle: "cloudflare", name: "Cloudflare", bio: "Official account", source: ["official"] },
  { handle: "CloudflareDev", name: "Cloudflare Developers", bio: "Developer products", source: ["official"] },
  { handle: "CFchangelog", name: "Cloudflare Changelog", bio: "Official changelog feed", source: ["official"] },

  // Leadership
  { handle: "eastdakota", name: "Matthew Prince", bio: "Co-founder & CEO of Cloudflare", source: ["following"] },
  { handle: "ritakozlov_", name: "Rita Kozlov", bio: "VP Developers & AI @cloudflare", source: ["blog-author", "following"] },
  { handle: "dok2001", name: "Dane Knecht", bio: "CTO @cloudflare", source: ["blog-author", "following"] },
  { handle: "celso", name: "Celso Martinho", bio: "VP of Engineering @cloudflare", source: ["following"] },

  // Blog post authors (Agents Week)
  { handle: "threepointone", name: "Sunil Pai", bio: "github.com/cloudflare/agents", source: ["blog-author", "following"] },
  { handle: "elithrar", name: "Matt Silverlock", bio: "VP of product: storage & databases @cloudflare", source: ["blog-author", "following"] },
  { handle: "goldbe", name: "Sharon Goldberg", bio: "Cloudflare security", source: ["blog-author"] },
  { handle: "MattieTK", name: "Matt TK Taylor", bio: "Cloudflare CLI", source: ["blog-author"] },
  { handle: "_mchenco", name: "Michelle Chen", bio: "terminal romantic @cloudflare", source: ["blog-author", "following"] },
  { handle: "thomasgauvin", name: "Thomas Gauvin", bio: "Cloudflare Mesh, Email", source: ["blog-author"] },
  { handle: "kathyyliao", name: "Kathy Liao", bio: "Browser Run", source: ["blog-author"] },
  { handle: "mattzcarey", name: "Matt Carey", bio: "agents and mcp @cloudflare", source: ["blog-author", "following"] },
  { handle: "ejllgomes", name: "Eduardo Gomes", bio: "Managed OAuth for Access", source: ["blog-author"] },
  { handle: "minglu", name: "Ming Lu", bio: "ai product @cloudflare", source: ["blog-author", "following"] },
  { handle: "aninibread", name: "Anni Wang", bio: "r2, ai search @ cloudflare", source: ["blog-author", "following"] },
  { handle: "kentonvarda", name: "Kenton Varda", bio: "Tech lead for @Cloudflare Workers", source: ["blog-author", "following"] },
  { handle: "thellamapriest", name: "Ankit Shah", bio: "Registrar API", source: ["blog-author"] },
  { handle: "vaiton13", name: "Vy Ton", bio: "Cloudflare Workers + PlanetScale", source: ["blog-author"] },

  // From @zeke's following list (Cloudflare in bio, not blog authors)
  { handle: "bjyule", name: "Benjamin Yule", bio: "VP Eng for Workers @Cloudflare", source: ["following"] },
  { handle: "zebassembly", name: "zeb", bio: "eng @cloudflare", source: ["following"] },
  { handle: "_ashleypeacock", name: "Ashley Peacock", bio: "Cloudflare Dev Expert & Author", source: ["following"] },
  { handle: "darkmembo", name: "Mark Dembo", bio: "Helping people build on @cloudflare", source: ["following"] },
  { handle: "jamesqquick", name: "James Q Quick", bio: "Developer Educator, @cloudflare", source: ["following"] },
  { handle: "dillon_mulroy", name: "Dillon Mulroy", bio: "principal engineer @cloudflare", source: ["following"] },
  { handle: "yomnashousha", name: "Yomna Shousha", bio: "product @cloudflaredev", source: ["following"] },
  { handle: "southpolesteve", name: "Steve Faulkner", bio: "working on workers @cloudflare", source: ["following"] },
  { handle: "nevikashah", name: "Nevi Shah", bio: "building workers observability, pm @cloudflaredev", source: ["following"] },
  { handle: "ghostwriternr", name: "Naresh", bio: "agents agent @cloudflare", source: ["following"] },
  { handle: "boristane", name: "Boris", bio: "prev @cloudflaredev", source: ["following"] },
  { handle: "ThomasJDesmond", name: "Thomas Desmond", bio: "@Cloudflare Senior Demo Engineer", source: ["following"] },
  { handle: "fayazara", name: "Fayaz Ahmed", bio: "Sr. Dev Educator @cloudflare", source: ["following"] },
  { handle: "kristianfreeman", name: "Kristian Freeman", bio: "Tokenmaxxing @Cloudflare", source: ["following"] },
  { handle: "harshil1712", name: "Harshil", bio: "Builder, Author, Educator @Cloudflare", source: ["following"] },
  { handle: "burcs", name: "Brandon", bio: "product @cloudflare, founder @outerbase (acquired)", source: ["following"] },
  { handle: "PeterSaulitis", name: "Peter Saulitis", bio: "Dev Marketing @Cloudflare", source: ["following"] },
  { handle: "shridharathi", name: "Shridhar", bio: "engineer @cloudflare", source: ["following"] },
  { handle: "superhighfives", name: "Charlie Gleason", bio: "Design engineering @cloudflare", source: ["following"] },
  { handle: "corywilkerson", name: "Cory Wilkerson", bio: "@cloudflare @replicate", source: ["following"] },
  { handle: "lucatac0", name: "Luis Catacora", bio: "GenAI @Cloudflare, prev @replicate (acquired)", source: ["following"] },
  { handle: "craigsdennis", name: "Craig Dennis", bio: "Developer Educator, AI @cloudflare", source: ["following"] },
  { handle: "allnoteson", name: "Andreas Jansson", bio: "Harness engineer @cloudflare, prev co-founder @replicate", source: ["following"] },
  { handle: "mattrothenberg", name: "Matt Rothenberg", bio: "@cloudflare, prev @replicate", source: ["following"] },
  { handle: "AlexVianaPro", name: "Alex C. Viana", bio: "Workers Observability EM @cloudflare", source: ["following"] },
  { handle: "whoiskatrin", name: "Kate", bio: "building agents and sandboxes @cloudflare", source: ["following"] },
];

// Attempt to augment from blog post "Follow on X" sections
async function scrapeHandlesFromBlog(url: string): Promise<Handle[]> {
  const handles: Handle[] = [];
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    // Look for "Follow on X" links pattern: Name|@handle
    const text = $("body").text();
    const matches = text.matchAll(/Follow on X\s+([\s\S]*?)(?:Related posts|Cloudflare's connectivity)/g);
    for (const match of matches) {
      const section = match[1];
      const handleMatches = section.matchAll(/([^|@\n]+)\|?\s*@(\w+)/g);
      for (const hm of handleMatches) {
        const name = hm[1].trim();
        const handle = hm[2].trim();
        if (handle.toLowerCase() !== "cloudflare") {
          handles.push({ handle, name, bio: `Blog author`, source: ["blog-scrape"] });
        }
      }
    }
  } catch {
    // Silently skip failed fetches
  }
  return handles;
}

export async function collectHandles(): Promise<Handle[]> {
  console.log("Collecting handles from curated seed list...");
  const handleMap = new Map<string, Handle>();

  // Add seed handles
  for (const h of SEED_HANDLES) {
    const key = h.handle.toLowerCase();
    if (handleMap.has(key)) {
      const existing = handleMap.get(key)!;
      existing.source = [...new Set([...existing.source, ...h.source])];
    } else {
      handleMap.set(key, { ...h });
    }
  }

  console.log(`Seed list: ${handleMap.size} handles`);

  // Optionally try to augment from blog posts
  const blogUrls = [
    "https://blog.cloudflare.com/welcome-to-agents-week/",
    "https://blog.cloudflare.com/project-think/",
    "https://blog.cloudflare.com/sandbox-ga/",
    "https://blog.cloudflare.com/voice-agents/",
  ];

  console.log("Augmenting from blog posts...");
  for (const url of blogUrls) {
    const scraped = await scrapeHandlesFromBlog(url);
    for (const h of scraped) {
      const key = h.handle.toLowerCase();
      if (!handleMap.has(key)) {
        handleMap.set(key, h);
        console.log(`  + Found new handle from blog: @${h.handle} (${h.name})`);
      }
    }
  }

  const handles = Array.from(handleMap.values()).sort((a, b) =>
    a.handle.toLowerCase().localeCompare(b.handle.toLowerCase())
  );

  console.log(`Total unique handles: ${handles.length}`);
  return handles;
}

async function main() {
  const handles = await collectHandles();

  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, "handles.json");
  writeFileSync(outPath, JSON.stringify(handles, null, 2));
  console.log(`Wrote ${handles.length} handles to ${outPath}`);

  // Print summary
  const individuals = handles.filter((h) => !["cloudflare", "cloudflaredev", "cfchangelog"].includes(h.handle.toLowerCase()));
  console.log(`\n${individuals.length} individual accounts, ${handles.length - individuals.length} official accounts`);
}

main().catch(console.error);
