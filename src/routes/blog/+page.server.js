import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function load() {
  const postsDir = path.resolve("src/routes/blog/posts");
  const filenames = fs.readdirSync(postsDir);
  const posts = filenames.map((name) => {
    const file = fs.readFileSync(path.join(postsDir, name), "utf-8");
    const { content, data } = matter(file);
    return {
      slug: name.replace(".md", ""),
      content,
      ...data,
    };
  });

  return { posts };
}
