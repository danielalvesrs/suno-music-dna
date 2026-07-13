import { useState } from "react";
import { Search, Music, Loader2, Plus, Trash2, CheckCircle2, Globe, FileText, Youtube } from "lucide-react";
import { extractTracksFromTextOrUrl } from "../lib/gemini";

interface Track {
  title: string;
  artist: string;
  thumbnail?: string;
}

interface PlaylistInputProps {
  onTracksFound: (tracks: Track[]) => void;
}

type Mode = "youtube" | "streaming" | "text" | "single";

export default function PlaylistInput({ onTracksFound }: PlaylistInputProps) {
  const [url, setUrl] = useState("");
  const [textList, setTextList] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("youtube");
  const [tempTracks, setTempTracks] = useState<Track[]>([]);

  const fetchMetadata = async () => {
    setLoading(true);
    setError("");

    try {
      if (mode === "youtube") {
        if (!url) return;
        const apiKey = process.env.YOUTUBE_API_KEY;

        // Try YouTube API first
        if (apiKey) {
          try {
            // Extract playlist ID
            const playlistIdMatch = url.match(/[&?]list=([^&]+)/i);
            const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

            if (playlistId) {
              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${playlistId}&key=${apiKey}`
              );

              if (response.ok) {
                const data = await response.json();
                const tracks = data.items.map((item: any) => {
                  const title = item.snippet.title;
                  const parts = title.split(" - ");
                  return {
                    title: parts[1] || title,
                    artist: parts[0] || "Unknown Artist",
                    thumbnail: item.snippet.thumbnails?.default?.url,
                  };
                });
                onTracksFound(tracks);
                setLoading(false);
                return;
              }
            } else {
              // Try single video ID
              const videoIdMatch = url.match(/(?:v=|\/|embed\/|youtu\.be\/)([^&?/]+)/);
              const videoId = videoIdMatch ? videoIdMatch[1] : url;

              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
              );

              if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                  const item = data.items[0];
                  const title = item.snippet.title;
                  const parts = title.split(" - ");
                  const newTrack = {
                    title: parts[1] || title,
                    artist: parts[0] || "Unknown Artist",
                    thumbnail: item.snippet.thumbnails?.default?.url,
                  };
                  onTracksFound([newTrack]);
                  setUrl("");
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (apiErr) {
            console.warn("YouTube API failed, falling back to AI extraction:", apiErr);
          }
        }

        // AI Extraction fallback if API key is missing, invalid, or quota exceeded
        console.log("Using AI fallback to extract YouTube playlist/video metadata");
        const extracted = await extractTracksFromTextOrUrl(url);
        if (!extracted || extracted.length === 0) {
          throw new Error("Não foi possível identificar as músicas a partir deste link.");
        }
        onTracksFound(extracted);

      } else if (mode === "streaming") {
        if (!url) return;
        // Extract tracks from Spotify, Apple Music, Deezer, etc. using AI
        const extracted = await extractTracksFromTextOrUrl(url);
        if (!extracted || extracted.length === 0) {
          throw new Error("Não foi possível encontrar músicas neste link. Tente colar a lista como texto.");
        }
        onTracksFound(extracted);

      } else if (mode === "text") {
        if (!textList.trim()) return;
        // Parse raw text input
        const extracted = await extractTracksFromTextOrUrl(textList);
        if (!extracted || extracted.length === 0) {
          throw new Error("Nenhuma música detectada. Certifique-se de listar o título e artista.");
        }
        onTracksFound(extracted);

      } else if (mode === "single") {
        if (!url) return;
        // Extract single manually or using AI
        const extracted = await extractTracksFromTextOrUrl(url);
        if (extracted && extracted.length > 0) {
          setTempTracks([...tempTracks, extracted[0]]);
          setUrl("");
        } else {
          // Manual fallback
          const parts = url.split(" - ");
          const newTrack = {
            title: parts[1] || url,
            artist: parts[0] || "Artista Desconhecido",
          };
          setTempTracks([...tempTracks, newTrack]);
          setUrl("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao buscar os dados da playlist.");
    } finally {
      setLoading(false);
    }
  };

  const removeTrack = (index: number) => {
    setTempTracks(tempTracks.filter((_, i) => i !== index));
  };

  const finalizeSingleVideos = () => {
    if (tempTracks.length > 0) {
      onTracksFound(tempTracks);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="bg-orange-50 p-1 rounded-2xl border border-orange-100 flex flex-wrap gap-1 justify-center shadow-sm">
          <button
            onClick={() => {
              setMode("youtube");
              setTempTracks([]);
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "youtube" ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:text-orange-600"
            }`}
          >
            <Youtube size={14} />
            <span>YouTube</span>
          </button>
          <button
            onClick={() => {
              setMode("streaming");
              setTempTracks([]);
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "streaming" ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:text-orange-600"
            }`}
          >
            <Globe size={14} />
            <span>Spotify / Outros</span>
          </button>
          <button
            onClick={() => {
              setMode("text");
              setTempTracks([]);
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "text" ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:text-orange-600"
            }`}
          >
            <FileText size={14} />
            <span>Colar Lista (Texto)</span>
          </button>
          <button
            onClick={() => {
              setMode("single");
              setError("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "single" ? "bg-orange-500 text-white shadow-sm" : "text-orange-400 hover:text-orange-600"
            }`}
          >
            <Plus size={14} />
            <span>Adicionar 1 a 1</span>
          </button>
        </div>
      </div>

      {mode !== "text" ? (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-white rounded-2xl border border-orange-100 p-1.5 shadow-sm">
            <div className="pl-4 text-orange-400">
              <Music size={18} />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mode === "youtube"
                  ? "Cole o link da playlist ou do vídeo do YouTube..."
                  : mode === "streaming"
                  ? "Cole o link da playlist (Spotify, Apple Music, Deezer, etc.)..."
                  : "Digite o nome da música ou 'Nome - Artista'..."
              }
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm text-gray-700 placeholder-gray-400 font-medium"
              onKeyDown={(e) => {
                if (e.key === "Enter" && url) {
                  fetchMetadata();
                }
              }}
            />
            <button
              onClick={fetchMetadata}
              disabled={loading || !url}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : mode === "single" ? <Plus size={14} /> : <Search size={14} />}
              <span>{mode === "single" ? "Adicionar" : "Analisar"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-2xl border border-orange-100 p-4 shadow-sm space-y-3">
            <textarea
              value={textList}
              onChange={(e) => setTextList(e.target.value)}
              placeholder={`Cole sua lista de músicas aqui, uma por linha. Exemplos:
• Queen - Bohemian Rhapsody
• Eagles - Hotel California
• Imagine Dragons - Believer`}
              rows={5}
              className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-700 placeholder-gray-400 font-medium resize-none focus:outline-none"
            />
            <div className="flex justify-end pt-2 border-t border-gray-50">
              <button
                onClick={fetchMetadata}
                disabled={loading || !textList.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                <span>Analisar Lista</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Tracks List for Single Mode */}
      {mode === "single" && tempTracks.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
              Músicas Adicionadas ({tempTracks.length})
            </h3>
            <button
              onClick={finalizeSingleVideos}
              className="flex items-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Finalizar e Analisar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {tempTracks.map((track, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                <div className="w-8 h-8 bg-orange-50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-orange-400">
                  <Music size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{track.title}</p>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                </div>
                <button
                  onClick={() => removeTrack(i)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        {mode === "youtube"
          ? "Playlist pública do YouTube ou vídeo individual"
          : mode === "streaming"
          ? "Suporte inteligente para links do Spotify, Apple Music, Deezer, etc."
          : mode === "text"
          ? "Copie de qualquer reprodutor ou bloco de notas e cole as linhas"
          : "Insira músicas uma a uma informando o nome e o artista"}
      </p>
    </div>
  );
}
