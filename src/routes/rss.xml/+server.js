import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const prerender = true;

const SITE_URL = "https://daniele-rolli.com";
const BLOG_PATH = path.resolve("src/routes/blog/posts");
const FALLBACK_DESCRIPTION = "Thoughts on software, design, and open source.";
const MAX_DESCRIPTION_LENGTH = 240;

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripMarkup = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildDescription = (post) => {
  const candidate = post.description || post.excerpt || stripMarkup(post.content);
  if (!candidate) return FALLBACK_DESCRIPTION;
  if (candidate.length <= MAX_DESCRIPTION_LENGTH) return candidate;
  return `${candidate.slice(0, MAX_DESCRIPTION_LENGTH).trim()}...`;
};

const readPosts = () =>
  fs
    .readdirSync(BLOG_PATH)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(BLOG_PATH, file);
      const source = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(source);
      const date = new Date(data.date);
      const isValidDate = !Number.isNaN(date.getTime());

      return {
        ...data,
        content,
        slug: file.replace(".md", ""),
        date: isValidDate ? date : null,
      };
    })
    .sort((a, b) => {
      const aDate = a.date ? a.date.getTime() : 0;
      const bDate = b.date ? b.date.getTime() : 0;
      return bDate - aDate;
    });

export async function GET() {
  const posts = readPosts();

  const render = (items) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Daniele Rolli Blog</title>
  <description>${escapeXml(FALLBACK_DESCRIPTION)}</description>
  <link>${SITE_URL}/blog</link>
  <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
  ${items
    .map(
      (post) => `
    <item>
      <title>${escapeXml(post.title || post.slug)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid>${SITE_URL}/blog/${post.slug}</guid>
      ${
        post.date
          ? `<pubDate>${post.date.toUTCString()}</pubDate>`
          : ""
      }
      <description>${escapeXml(buildDescription(post))}</description>
    </item>
  `,
    )
    .join("")}
</channel>
</rss>`;

  return new Response(render(posts), {
    headers: {
      "Cache-Control": "max-age=0, s-maxage=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
