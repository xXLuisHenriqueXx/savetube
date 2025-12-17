import { NextRequest } from "next/server";
import ytdl from "@distube/ytdl-core";

function formatBytes(bytes?: string | number | null): string | null {
  if (!bytes) return null;

  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return null;

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function getResolution(label?: string): number | null {
  if (!label) return null;
  const match = label.match(/^(\d+)p/);
  return match ? Number(match[1]) : null;
}

function formatKey(f: any): string {
  return [
    f.itag,
    f.container,
    f.qualityLabel ?? "audio",
    f.fps ?? 0,
    f.hasVideo,
    f.hasAudio,
  ].join("|");
}

function pickBetter(a: any, b: any): any {
  if (a.contentLength && !b.contentLength) return a;
  if (!a.contentLength && b.contentLength) return b;

  if (a.contentLength && b.contentLength) {
    return Number(a.contentLength) >= Number(b.contentLength) ? a : b;
  }

  if (a.averageBitrate && b.averageBitrate) {
    return a.averageBitrate >= b.averageBitrate ? a : b;
  }

  return a.bitrate >= b.bitrate ? a : b;
}

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

    const allowedResolutions = [360, 480, 720];
    const formatMap = new Map<string, any>();

    for (const f of info.formats) {
      if (!f.hasVideo && !f.hasAudio) continue;

      if (f.container !== "mp4") continue;

      const resolution = getResolution(f.qualityLabel);

      if (f.hasVideo) {
        if (!resolution || !allowedResolutions.includes(resolution)) {
          continue;
        }
      }

      const key = formatKey(f);
      const existing = formatMap.get(key);

      if (!existing) {
        formatMap.set(key, f);
      } else {
        formatMap.set(key, pickBetter(existing, f));
      }
    }

    const formats = Array.from(formatMap.values())
      .map((f) => {
        const resolution = getResolution(f.qualityLabel);

        let type: "video+audio" | "video-only" | "audio-only";

        if (f.hasVideo && f.hasAudio) type = "video+audio";
        else if (f.hasVideo) type = "video-only";
        else type = "audio-only";

        return {
          itag: f.itag,
          type,
          hasVideo: f.hasVideo,
          hasAudio: f.hasAudio,
          qualityLabel: f.qualityLabel ?? null,
          resolution,
          fps: f.fps ?? null,
          width: f.width ?? null,
          height: f.height ?? null,
          audioBitrate: f.audioBitrate ?? null,
          container: f.container,
          mimeType: f.mimeType,
          size: formatBytes(f.contentLength),
          contentLength: f.contentLength ?? null,
        };
      })
      .sort((a, b) => {
        if (a.hasVideo !== b.hasVideo) {
          return a.hasVideo ? -1 : 1;
        }

        return (b.resolution ?? 0) - (a.resolution ?? 0);
      });

    return new Response(
      JSON.stringify({
        title: info.videoDetails.title,
        author: info.videoDetails.author?.name ?? null,
        durationSeconds: Number(info.videoDetails.lengthSeconds),
        thumbnail: info.videoDetails.thumbnails?.at(-1)?.url ?? null,
        formats,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[YTDL_ERROR]", error);

    return new Response(
      JSON.stringify({
        error: "Erro ao buscar informações do vídeo",
      }),
      { status: 500 }
    );
  }
}
