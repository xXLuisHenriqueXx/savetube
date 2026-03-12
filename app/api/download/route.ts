import { NextRequest } from "next/server";
import { extractVideoId, fetchPlayerResponse } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const url = params.get("url");
  const itag = params.get("itag");

  if (!url || !itag) {
    return Response.json({ error: "URL e itag obrigatórios" }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId)
    return Response.json({ error: "URL inválida" }, { status: 400 });

  try {
    const player = await fetchPlayerResponse(videoId);

    const allFormats = [
      ...(player.streamingData?.formats ?? []),
      ...(player.streamingData?.adaptiveFormats ?? []),
    ];

    const format = allFormats.find(
      (f: any) => f.itag.toString() === itag && f.url,
    );

    if (!format) {
      return Response.json(
        { error: "Formato não encontrado" },
        { status: 400 },
      );
    }

    const upstream = await fetch(format.url);
    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { error: "Falha ao buscar stream" },
        { status: 502 },
      );
    }

    const title = (player.videoDetails?.title ?? "video")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim();

    const isAudio = !(format.mimeType ?? "").includes("video/");
    const filename = isAudio ? `${title}.m4a` : `${title}.mp4`;

    return new Response(upstream.body, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": format.mimeType ?? "application/octet-stream",
        ...(format.contentLength && {
          "Content-Length": format.contentLength.toString(),
        }),
      },
    });
  } catch (error: any) {
    console.error("[DOWNLOAD_ERROR]", error?.message);
    return Response.json(
      { error: "Erro ao iniciar download" },
      { status: 500 },
    );
  }
}
