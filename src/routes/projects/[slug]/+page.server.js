import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export async function load({ params }) {
  const { slug } = params;

  const filePath = path.resolve('src/routes/projects/posts', `${slug}.md`);
  const file = fs.readFileSync(filePath, 'utf-8');
  const { content, data } = matter(file);

  return {
    content,
    metadata: data
  };
}