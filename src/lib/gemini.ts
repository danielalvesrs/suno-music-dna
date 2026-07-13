export interface TrackDNA {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  progression: string;
  structure: string;
  energy: number; // 1-10
  mood: string;
  thematicIdea: string; // The "idea" or message behind the lyrics/theme
}

export interface HybridDNA {
  title: string;
  baseBpm: number;
  dominantKey: string;
  combinedProgression: string;
  suggestedStructure: string;
  averageEnergy: number;
  overallMood: string;
  instruments: string[];
  catchySpice?: string;
  sunoStylePrompt: string; // Under 120 chars for Suno "Style of Music"
  sunoLyrics: string;      // Lyrics with [Verse], [Chorus] tags or structured instrumental sections
  thematicNarrative: string; // The synthesized "idea" for the new song
}

const getCustomHeaders = () => {
  const customKey = typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (customKey) {
    headers["x-gemini-api-key"] = customKey.trim();
  }
  return headers;
};

export const analyzePlaylistDNA = async (tracks: { title: string; artist: string }[], signal?: AbortSignal): Promise<TrackDNA[]> => {
  const response = await fetch("/api/gemini/analyze-playlist", {
    method: "POST",
    headers: getCustomHeaders(),
    body: JSON.stringify({ tracks }),
    signal,
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro na análise de playlist pelo servidor. Por favor, verifique se sua chave API é válida ou tente novamente mais tarde.");
  }
  
  return response.json();
};

export const createHybridDNA = async (dnas: TrackDNA[], instrumentalOnly: boolean, mashupMode: boolean = false, lyricsLanguage: string = "Português", soloInstruments?: string[], baseInstruments?: string[], signal?: AbortSignal): Promise<HybridDNA> => {
  const response = await fetch("/api/gemini/create-hybrid", {
    method: "POST",
    headers: getCustomHeaders(),
    body: JSON.stringify({ dnas, instrumentalOnly, mashupMode, lyricsLanguage, soloInstruments, baseInstruments }),
    signal,
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao sintetizar DNA híbrido no servidor.");
  }
  
  return response.json();
};

export const updateSunoPrompt = async (dna: HybridDNA, instrumentalOnly: boolean, lyricsLanguage: string = "Português", soloInstruments?: string[], baseInstruments?: string[], signal?: AbortSignal): Promise<{ sunoStylePrompt: string; sunoLyrics: string }> => {
  const response = await fetch("/api/gemini/update-prompt", {
    method: "POST",
    headers: getCustomHeaders(),
    body: JSON.stringify({ dna, instrumentalOnly, lyricsLanguage, soloInstruments, baseInstruments }),
    signal,
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao atualizar prompt do Suno no servidor.");
  }
  
  return response.json();
};

export const extractTracksFromTextOrUrl = async (input: string, signal?: AbortSignal): Promise<{ title: string; artist: string }[]> => {
  const response = await fetch("/api/gemini/extract-tracks", {
    method: "POST",
    headers: getCustomHeaders(),
    body: JSON.stringify({ input }),
    signal,
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao extrair faixas no servidor.");
  }
  
  return response.json();
};
