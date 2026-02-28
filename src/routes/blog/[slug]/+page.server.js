import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function load({ params }) {
  const { slug } = params;
  const filePath = path.resolve("src/routes/blog/posts", `${slug}.md`);
  const file = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(file);

  return {
    content,
    metadata: data,
  };
}
