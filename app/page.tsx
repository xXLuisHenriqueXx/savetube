"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInfo = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.error || !res.ok) {
        setError(data.error ?? "Erro desconhecido");
        return;
      }
      setVideoInfo(data);
    } catch {
      setError("Falha de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!url || !selectedFormat) return;

    window.open(
      `/api/download?url=${encodeURIComponent(url)}&itag=${selectedFormat}`,
      "_blank",
    );
  };

  const currentFormat = videoInfo?.formats.find(
    (f: any) => f.itag.toString() === selectedFormat,
  );

  const formatLabel = (format: any) => {
    switch (format.type) {
      case "audio-only":
        return `🎵 Áudio (${format.container})`;
      case "video-only":
        return `🎬 ${format.qualityLabel} (sem áudio)`;
      case "video+audio":
        return `🎬 ${format.qualityLabel} (áudio incluso)`;
      default:
        return "Formato desconhecido";
    }
  };

  const downloadButtonLabel = () => {
    if (!currentFormat) return "Baixar";

    if (currentFormat.type === "audio-only") return "Baixar Áudio";
    if (currentFormat.type === "video-only") return "Baixar Vídeo (sem áudio)";

    return "Baixar Vídeo";
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">SaveTube</h1>

          <div className="flex flex-col items-center gap-2">
            <Input
              placeholder="Cole o link do YouTube"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchInfo()}
            />

            <Button
              className="w-full"
              disabled={loading}
              onClick={handleFetchInfo}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Carregar"}
            </Button>
          </div>

          {videoInfo && (
            <>
              <Separator />

              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-4 w-full">
                  {videoInfo.thumbnail && (
                    <div className="relative w-1/3">
                      <Image
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        width={120}
                        height={90}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex flex-col w-2/3">
                    <h2 className="text-sm font-semibold">{videoInfo.title}</h2>
                    <p className="text-xs text-gray-500">{videoInfo.author}</p>
                  </div>
                </div>

                <Separator />

                <Select
                  value={selectedFormat ?? undefined}
                  onValueChange={setSelectedFormat}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o formato desejado" />
                  </SelectTrigger>

                  <SelectContent>
                    {videoInfo.formats.map((format: any) => (
                      <SelectItem
                        key={format.itag}
                        value={format.itag.toString()}
                      >
                        <div className="flex justify-between w-full items-center">
                          <span className="font-medium mr-4">
                            {formatLabel(format)}
                          </span>

                          <span className="text-xs text-gray-500 ml-auto">
                            {format.size ?? "Tamanho desconhecido"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentFormat?.type === "video-only" && (
                  <div className="flex items-center gap-2 text-xs text-yellow-600">
                    <AlertTriangle size={14} />
                    Este formato não contém áudio. Será necessário mux.
                  </div>
                )}

                <Button onClick={handleDownload} disabled={!selectedFormat}>
                  {downloadButtonLabel()}
                  {currentFormat?.size ? ` (${currentFormat.size})` : ""}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
