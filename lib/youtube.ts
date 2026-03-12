// lib/youtube.ts

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop() ?? null
    );
  } catch {
    return null;
  }
}

// Passo 1: extrai a API key do HTML da página
async function getInnertubeApiKey(videoId: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await res.text();
  const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (!match) throw new Error("INNERTUBE_API_KEY não encontrado na página");
  return match[1];
}

// Passo 2: chama o player com a key real + client ANDROID
export async function fetchPlayerResponse(videoId: string) {
  const apiKey = await getInnertubeApiKey(videoId);

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
          },
        },
        videoId,
      }),
    },
  );

  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}
