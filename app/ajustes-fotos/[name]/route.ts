import { readFile } from "fs/promises";
import path from "path";

const types: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!/^[\w.-]+$/.test(name)) return new Response("Foto não encontrada.", { status: 404 });
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const type = types[ext];
  if (!type) return new Response("Foto não encontrada.", { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "data", "ajustes", name));
    return new Response(bytes, { headers: { "content-type": type, "cache-control": "private, max-age=86400" } });
  } catch {
    return new Response("Foto não encontrada.", { status: 404 });
  }
}
