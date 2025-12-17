import { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";

const agent = ytdl.createAgent();

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
}

function pickBestFormat(formats: any[]) {
  return formats.reduce((best, current) => {
    if (!best) return current;

    if (best.contentLength && !current.contentLength) return best;
    if (!best.contentLength && current.contentLength) return current;

    if (best.contentLength && current.contentLength) {
      return Number(current.contentLength) >= Number(best.contentLength)
        ? current
        : best;
    }

    if (best.averageBitrate && current.averageBitrate) {
      return current.averageBitrate >= best.averageBitrate ? current : best;
    }

    return current.bitrate >= best.bitrate ? current : best;
  }, null);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get("url");
  const itag = searchParams.get("itag");

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return new Response(JSON.stringify({ error: "URL inválida" }), {
      status: 400,
    });
  }

  if (!itag) {
    return new Response(JSON.stringify({ error: "ITAG obrigatório" }), {
      status: 400,
    });
  }

  try {
    const info = await ytdl.getInfo(videoUrl, { agent });

    const candidates = info.formats.filter((f) => f.itag.toString() === itag);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ error: "Formato não encontrado" }), {
        status: 400,
      });
    }

    const format = pickBestFormat(candidates);

    const title = sanitizeFilename(info.videoDetails.title);

    let type: "video+audio" | "video-only" | "audio-only";
    if (format.hasVideo && format.hasAudio) type = "video+audio";
    else if (format.hasVideo) type = "video-only";
    else type = "audio-only";

    const extension = type === "audio-only" ? "m4a" : format.container || "mp4";

    const filename =
      type === "audio-only"
        ? `${title}.audio.${extension}`
        : `${title}.${extension}`;

    const stream = ytdl(videoUrl, {
      format,
      agent,
    });

    const headers = new Headers({
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": format.mimeType || "application/octet-stream",
      "X-Stream-Type": type,
      ...(format.contentLength && {
        "Content-Length": format.contentLength,
      }),
    });

    return new Response(stream as any, { headers });
  } catch (error) {
    console.error("[YTDL_DOWNLOAD_ERROR]", error);

    return new Response(
      JSON.stringify({
        error: "Erro ao iniciar o download (YouTube bloqueou a requisição)",
      }),
      { status: 500 }
    );
  }
}
