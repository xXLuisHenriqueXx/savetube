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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
// import Image from "next/image";

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetchInfo = async () => {
    if (!url) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data.error) {
        setVideoInfo(data);
        setSelectedFormat(data.formats[0]?.itag || "");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!url || !selectedFormat) return;
    window.open(
      `/api/download?url=${encodeURIComponent(url)}&itag=${selectedFormat}`,
      "_blank"
    );
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

                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o formato de vídeo desejado ..." />
                  </SelectTrigger>
                  <SelectContent>
                    {videoInfo.formats.map((f: any, i: number) => (
                      <SelectItem key={i} value={f.itag}>
                        {f.audioOnly
                          ? `Áudio (${f.container})`
                          : `${f.qualityLabel || "Sem vídeo"} (${f.container})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleDownload}>Baixar</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
