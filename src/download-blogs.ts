import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOGS_DIR = join(__dirname, "..", "data", "blogs");

const BLOG_POSTS = [
  { slug: "welcome-to-agents-week", date: "2026-04-12" },
  { slug: "cf-cli-local-explorer", date: "2026-04-13" },
  { slug: "durable-object-facets-dynamic-workers", date: "2026-04-13" },
  { slug: "sandbox-ga", date: "2026-04-13" },
  { slug: "improved-developer-security", date: "2026-04-14" },
  { slug: "enterprise-mcp", date: "2026-04-14" },
  { slug: "managed-oauth-for-access", date: "2026-04-14" },
  { slug: "mesh", date: "2026-04-14" },
  { slug: "project-think", date: "2026-04-15" },
  { slug: "introducing-agent-lee", date: "2026-04-15" },
  { slug: "registrar-api-beta", date: "2026-04-15" },
  { slug: "browser-run-for-ai-agents", date: "2026-04-15" },
  { slug: "workflows-v2", date: "2026-04-15" },
  { slug: "voice-agents", date: "2026-04-15" },
  { slug: "deploy-planetscale-postgres-with-workers", date: "2026-04-15" },
  { slug: "artifacts-git-for-agents-beta", date: "2026-04-16" },
  { slug: "ai-platform", date: "2026-04-16" },
  { slug: "high-performance-llms", date: "2026-04-16" },
  { slug: "ai-search-agent-primitive", date: "2026-04-16" },
  { slug: "email-for-agents", date: "2026-04-16" },
];

function htmlToMarkdown($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  let md = "";

  el.contents().each((_, node) => {
    if (node.type === "text") {
      md += $(node).text();
      return;
    }

    if (node.type !== "tag") return;

    const $node = $(node);
    const tag = node.tagName?.toLowerCase();

    switch (tag) {
      case "h1":
        md += `\n# ${$node.text().trim()}\n\n`;
        break;
      case "h2":
        md += `\n## ${$node.text().trim()}\n\n`;
        break;
      case "h3":
        md += `\n### ${$node.text().trim()}\n\n`;
        break;
      case "h4":
        md += `\n#### ${$node.text().trim()}\n\n`;
        break;
      case "h5":
      case "h6":
        md += `\n##### ${$node.text().trim()}\n\n`;
        break;
      case "p":
        md += htmlToMarkdown($, $node) + "\n\n";
        break;
      case "br":
        md += "\n";
        break;
      case "strong":
      case "b":
        md += `**${htmlToMarkdown($, $node)}**`;
        break;
      case "em":
      case "i":
        md += `*${htmlToMarkdown($, $node)}*`;
        break;
      case "a": {
        const href = $node.attr("href") || "";
        const text = htmlToMarkdown($, $node);
        if (href && text) {
          md += `[${text}](${href})`;
        } else {
          md += text;
        }
        break;
      }
      case "code": {
        const text = $node.text();
        if ($node.parent()?.is("pre")) {
          // handled by pre
        } else {
          md += `\`${text}\``;
        }
        break;
      }
      case "pre": {
        const code = $node.find("code");
        const lang = (code.attr("class") || "").replace(/language-/, "").split(" ")[0] || "";
        const text = code.length ? code.text() : $node.text();
        md += `\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
        break;
      }
      case "ul":
        $node.children("li").each((_, li) => {
          md += `- ${htmlToMarkdown($, $(li)).trim()}\n`;
        });
        md += "\n";
        break;
      case "ol":
        $node.children("li").each((i, li) => {
          md += `${i + 1}. ${htmlToMarkdown($, $(li)).trim()}\n`;
        });
        md += "\n";
        break;
      case "li":
        md += htmlToMarkdown($, $node);
        break;
      case "blockquote":
        const bqLines = htmlToMarkdown($, $node).trim().split("\n");
        md += bqLines.map((l) => `> ${l}`).join("\n") + "\n\n";
        break;
      case "img": {
        const alt = $node.attr("alt") || "";
        const src = $node.attr("src") || "";
        if (src) md += `![${alt}](${src})\n\n`;
        break;
      }
      case "figure": {
        const img = $node.find("img");
        const caption = $node.find("figcaption").text().trim();
        const src = img.attr("src") || "";
        const alt = img.attr("alt") || caption || "";
        if (src) md += `![${alt}](${src})\n\n`;
        if (caption) md += `*${caption}*\n\n`;
        break;
      }
      case "table": {
        const rows: string[][] = [];
        $node.find("tr").each((_, tr) => {
          const cells: string[] = [];
          $(tr)
            .find("th, td")
            .each((_, cell) => {
              cells.push($(cell).text().trim());
            });
          rows.push(cells);
        });
        if (rows.length > 0) {
          const maxCols = Math.max(...rows.map((r) => r.length));
          const colWidths = Array(maxCols).fill(3);
          for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
              colWidths[i] = Math.max(colWidths[i], row[i].length);
            }
          }
          // Header
          md += "| " + rows[0].map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |\n";
          md += "| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |\n";
          for (const row of rows.slice(1)) {
            md += "| " + row.map((c, i) => c.padEnd(colWidths[i] || 3)).join(" | ") + " |\n";
          }
          md += "\n";
        }
        break;
      }
      case "div":
      case "section":
      case "article":
      case "span":
      case "main":
        md += htmlToMarkdown($, $node);
        break;
      default:
        md += htmlToMarkdown($, $node);
        break;
    }
  });

  return md;
}

async function downloadPost(slug: string, date: string): Promise<{ title: string; markdown: string }> {
  const url = `https://blog.cloudflare.com/${slug}/`;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Extract title
  const title = $("h1").first().text().trim() || $("title").text().trim();

  // Extract authors
  const authors: string[] = [];
  $('a[href*="/author/"]').each((_, el) => {
    const name = $(el).text().trim();
    if (name && !authors.includes(name)) authors.push(name);
  });

  // Extract the main article content
  // Cloudflare blog uses article or post-content divs
  let $content = $("article .post-content, .post-body, article").first();
  if (!$content.length) {
    $content = $("main article, main .content, .blog-post-content").first();
  }
  if (!$content.length) {
    $content = $("article").first();
  }

  // Build markdown
  let markdown = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndate: ${date}\nurl: ${url}\nauthors: [${authors.map((a) => `"${a}"`).join(", ")}]\n---\n\n`;
  markdown += `# ${title}\n\n`;

  if (authors.length) {
    markdown += `By ${authors.join(", ")} | ${date}\n\n`;
  }

  if ($content.length) {
    // Remove translation links, nav, footer, and other non-content
    $content.find('nav, footer, [class*="translation"], [class*="related"], [class*="share"]').remove();
    markdown += htmlToMarkdown($, $content);
  } else {
    // Fallback: just get all the text
    markdown += $("body").text().substring(0, 5000);
  }

  // Clean up excessive whitespace
  markdown = markdown.replace(/\n{4,}/g, "\n\n\n").trim() + "\n";

  return { title, markdown };
}

async function main() {
  mkdirSync(BLOGS_DIR, { recursive: true });

  console.log(`Downloading ${BLOG_POSTS.length} Agents Week blog posts...\n`);

  // Process in batches of 5 to avoid overwhelming the server
  const BATCH_SIZE = 5;
  let completed = 0;

  for (let i = 0; i < BLOG_POSTS.length; i += BATCH_SIZE) {
    const batch = BLOG_POSTS.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ slug, date }) => {
        try {
          const { title, markdown } = await downloadPost(slug, date);
          const filename = `${date}-${slug}.md`;
          const filepath = join(BLOGS_DIR, filename);
          writeFileSync(filepath, markdown);
          completed++;
          console.log(`  [${completed}/${BLOG_POSTS.length}] ${title}`);
          return { slug, title, filename, size: markdown.length };
        } catch (err: any) {
          console.error(`  FAILED: ${slug}: ${err.message}`);
          return null;
        }
      })
    );
  }

  console.log(`\nDone. ${completed}/${BLOG_POSTS.length} posts saved to data/blogs/`);
}

main().catch(console.error);
