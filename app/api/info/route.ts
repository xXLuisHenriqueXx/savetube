import { NextRequest } from "next/server";
import { extractVideoId, fetchPlayerResponse } from "@/lib/youtube";

function formatBytes(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes,
    i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return Response.json({ error: "URL obrigatória" }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId)
    return Response.json({ error: "URL inválida" }, { status: 400 });

  try {
    const player = await fetchPlayerResponse(videoId);

    if (player.playabilityStatus?.status !== "OK") {
      return Response.json(
        { error: player.playabilityStatus?.reason ?? "Vídeo indisponível" },
        { status: 400 },
      );
    }

    const allFormats = [
      ...(player.streamingData?.formats ?? []),
      ...(player.streamingData?.adaptiveFormats ?? []),
    ];

    const ALLOWED_RESOLUTIONS = [360, 480, 720];

    const formats = allFormats
      .filter((f: any) => {
        if (!f.url) return false; // sem URL direta = precisaria de decipher, descarta
        const mime: string = f.mimeType ?? "";
        return mime.includes("video/mp4") || mime.includes("audio/mp4");
      })
      .map((f: any) => {
        const hasVideo = (f.mimeType ?? "").includes("video/");
        const hasAudio = !!f.audioQuality;
        const type =
          hasVideo && hasAudio
            ? "video+audio"
            : hasVideo
              ? "video-only"
              : "audio-only";

        const resolution = f.qualityLabel ? parseInt(f.qualityLabel) : null;

        return {
          itag: f.itag,
          type,
          hasVideo,
          hasAudio,
          qualityLabel: f.qualityLabel ?? null,
          resolution,
          fps: f.fps ?? null,
          width: f.width ?? null,
          height: f.height ?? null,
          container: "mp4",
          size: formatBytes(f.contentLength ? Number(f.contentLength) : null),
          contentLength: f.contentLength ? Number(f.contentLength) : null,
        };
      })
      .filter(
        (f: any) =>
          !f.hasVideo ||
          !f.resolution ||
          ALLOWED_RESOLUTIONS.includes(f.resolution),
      )
      .sort((a: any, b: any) => {
        if (a.hasVideo !== b.hasVideo) return a.hasVideo ? -1 : 1;
        return (b.resolution ?? 0) - (a.resolution ?? 0);
      });

    const details = player.videoDetails;

    return Response.json({
      title: details?.title ?? "Sem título",
      author: details?.author ?? null,
      durationSeconds: details?.lengthSeconds
        ? Number(details.lengthSeconds)
        : null,
      thumbnail: details?.thumbnail?.thumbnails?.at(-1)?.url ?? null,
      formats,
    });
  } catch (error: any) {
    console.error("[INFO_ERROR]", error?.message, error?.stack);
    return Response.json({ error: "Erro ao buscar vídeo" }, { status: 500 });
  }
}
