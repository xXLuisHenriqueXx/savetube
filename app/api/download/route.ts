import { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get("url");
  const itag = searchParams.get("itag");

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return new Response(JSON.stringify({ error: "URL inválida" }), {
      status: 400,
    });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = info.formats.find((f) => f.itag.toString() === itag);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "");

    if (!format) {
      return new Response(JSON.stringify({ error: "Formato não encontrado" }), {
        status: 400,
      });
    }

    const stream = ytdl(videoUrl, { format });

    const headers = new Headers({
      "Content-Disposition": `attachment; filename="${title}.${format.container}"`,
      "Content-Type": format.mimeType || "application/octet-stream",
    });

    return new Response(stream as any, { headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Erro ao processar vídeo" }), {
      status: 500,
    });
  }
}
