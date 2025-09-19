import { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return new Response(JSON.stringify({ error: "URL inválida" }), {
      status: 400,
    });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);

    const formats = info.formats
      .filter((f) => f.hasVideo || f.hasAudio)
      .map((f) => ({
        itag: f.itag,
        qualityLabel: f.qualityLabel || (f.hasAudio && "Apenas Áudio"),
        audioOnly: !f.hasVideo && f.hasAudio,
        container: f.container,
      }));

    const uniqueFormats = Array.from(
      new Map(
        formats.map((f) => [`${f.qualityLabel}-${f.audioOnly}`, f])
      ).values()
    );

    return new Response(
      JSON.stringify({
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.at(-1)?.url,
        formats: uniqueFormats,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar informações" }),
      { status: 500 }
    );
  }
}
