import { GoogleGenAI, Type } from "@google/genai";

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
  sunoStylePrompt: string; // Under 300 chars for Suno "Style of Music"
  sunoLyrics: string;      // Lyrics with [Verse], [Chorus] tags or structured instrumental sections
  thematicNarrative: string; // The synthesized "idea" for the new song
}

const COST_OPTIMIZED_MODEL = "gemini-3.1-flash-lite";
const CREATIVE_MODEL = "gemini-3.5-flash";

const getCustomApiKey = () => (
  typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key")?.trim() || "" : ""
);

const getCustomHeaders = () => {
  const customKey = getCustomApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (customKey) {
    headers["x-gemini-api-key"] = customKey;
  }
  return headers;
};

const getBrowserAi = () => {
  const apiKey = getCustomApiKey();
  if (!apiKey) {
    throw new Error("Para usar a demo publica, gere uma chave Gemini gratuita no Google AI Studio e cole no painel Chave API.");
  }
  return new GoogleGenAI({ apiKey });
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
};

const parseGeminiJson = <T>(text?: string): T => {
  if (!text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }
  return JSON.parse(text) as T;
};

const callServerOrBrowser = async <T>(
  url: string,
  body: unknown,
  signal: AbortSignal | undefined,
  browserFallback: () => Promise<T>,
  serverErrorMessage: string
): Promise<T> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCustomHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    if (response.ok) {
      return response.json();
    }

    const errData = await response.json().catch(() => ({}));
    const canUseBrowserFallback = !!getCustomApiKey() && (response.status === 404 || response.status === 405);
    if (!canUseBrowserFallback) {
      throw new Error(errData.error || serverErrorMessage);
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw err;
    }
    if (!getCustomApiKey()) {
      throw err;
    }
  }

  throwIfAborted(signal);
  return browserFallback();
};

const buildInstrumentInstructions = (soloInstruments?: string[], baseInstruments?: string[]) => {
  const soloText = soloInstruments && soloInstruments.length > 0 && !soloInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC SOLO INSTRUMENTS: The user wants these specific instruments for solos: ${soloInstruments.join(", ")}. Ensure they are explicitly added to the sunoStylePrompt and included in solo structure tags (e.g. [${soloInstruments[0]} Solo], [Solo de ${soloInstruments[0]}] or similar) in the sunoLyrics.`
    : "SOLO INSTRUMENTS: Let Suno decide or generate automatically based on the original playlist's DNA.";

  const baseText = baseInstruments && baseInstruments.length > 0 && !baseInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC BACKING/BASE INSTRUMENTS: The user wants these specific instruments for the rhythm/harmonic base: ${baseInstruments.join(", ")}. Ensure they are explicitly added as style/backing arrangement tags in the sunoStylePrompt.`
    : "BACKING/BASE INSTRUMENTS: Synthesize based on the original playlist's style.";

  return { soloText, baseText };
};

const analyzePlaylistDNABrowser = async (tracks: { title: string; artist: string }[], signal?: AbortSignal): Promise<TrackDNA[]> => {
  throwIfAborted(signal);
  const ai = getBrowserAi();
  const prompt = `Analyze the musical DNA of the following tracks. For each track, provide: BPM, Key, Chord Progression, Structure (e.g., Verse-Chorus), Energy (1-10), Mood, and the "Thematic Idea" (the core message or story of the lyrics/theme).

  IMPORTANT: All text fields (Mood, Thematic Idea, Structure) MUST be in Portuguese (PT-BR).

  Tracks:
  ${tracks.map((t, i) => `${i + 1}. ${t.title} by ${t.artist}`).join("\n")}

  Return the data as a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: COST_OPTIMIZED_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            key: { type: Type.STRING },
            progression: { type: Type.STRING },
            structure: { type: Type.STRING },
            energy: { type: Type.NUMBER },
            mood: { type: Type.STRING },
            thematicIdea: { type: Type.STRING },
          },
          required: ["title", "artist", "bpm", "key", "progression", "structure", "energy", "mood", "thematicIdea"],
        },
      },
    },
  });

  return parseGeminiJson<TrackDNA[]>(response.text);
};

const createHybridDNABrowser = async (
  dnas: TrackDNA[],
  instrumentalOnly: boolean,
  mashupMode: boolean = false,
  lyricsLanguage: string = "Português",
  soloInstruments?: string[],
  baseInstruments?: string[],
  signal?: AbortSignal
): Promise<HybridDNA> => {
  throwIfAborted(signal);
  const ai = getBrowserAi();
  const catchyUrl = "https://gemini.google.com/gem/caaa9af72be9/6bed029009a4dd1a";
  const sunoGuideUrl = "https://learnprompting.org/blog/guide-suno";
  const { soloText, baseText } = buildInstrumentInstructions(soloInstruments, baseInstruments);

  const prompt = `Based on the following musical DNAs, create a single "Hybrid DNA" that combines their best elements into a new, cohesive musical profile.

  DNAs:
  ${JSON.stringify(dnas, null, 2)}

  IMPORTANT: All descriptive fields (overallMood, catchySpice, thematicNarrative, instruments, title) MUST be in Portuguese (PT-BR).

  ${mashupMode ? "SPECIAL INSTRUCTION: MASHUP MODE IS ON. The goal is to create a 'Mashup' or 'Remix' style that aggressively blends the contrasting styles of the source tracks. The resulting prompt should feel like a creative collision of these tracks." : ""}

  USER INSTRUMENT SELECTIONS:
  - ${soloText}
  - ${baseText}

  Also:
  1. Analyze the content of ${catchyUrl} to identify the "catchy spice" (elements that make a song catchy/pegajosa), specifically looking for the "Golden Progression" (Progressão de Ouro) and other factors that make music addictive.
  2. Analyze the Suno Guide at ${sunoGuideUrl} to understand how to create highly optimized prompts using metatags (like [Verse], [Chorus], [Bridge], [Outro]), style tags, and proper structure.
  3. Synthesize the "Thematic Ideas" from all input tracks into a single, powerful "Thematic Narrative" for the new song.
  4. Generate a highly creative Portuguese Title for this hybrid song (if lyrics language is not Portuguese, you can generate a title in the selected language: ${lyricsLanguage}).
  5. Create a highly optimized Suno Style Prompt (sunoStylePrompt):
     - MUST BE UNDER 300 CHARACTERS!
     - Include key genre tags, detailed subgenres, precise mood, BPM, Key, specific instruments, production styles, and vocal/instrumental settings.
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (which is currently: ${instrumentalOnly}), you MUST NOT include any vocal instructions. Instead, include tags like "instrumental, no vocals, solo instruments, pure arrangement". If instrumentalOnly is false, ensure the vocal language matches ${lyricsLanguage}.
  6. Create highly optimized Suno Lyrics (sunoLyrics):
     - The user has requested an ${instrumentalOnly ? "INSTRUMENTAL ONLY" : "VOCAL AND INSTRUMENTAL"} track.
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (which is currently: ${instrumentalOnly}), the sunoLyrics field MUST ONLY contain structure metatags inside square brackets describing the musical arrangement progression.
     - If vocal (instrumentalOnly is false), write complete lyrics in ${lyricsLanguage} based on the "Thematic Narrative" of the song, structured with metatags like [Verse 1], [Chorus], [Bridge], [Outro].
     - The lyrics MUST respect the typical poetic meter, syllable counts, rhythm, natural cadence, and rhyme scheme of the selected language: ${lyricsLanguage}.
     ${mashupMode ? "- Since this is a MASHUP, explicitly use style tags like [Mashup], [Remix], [Style Blend] and describe how the different track elements collide." : ""}

  Return a single JSON object matching the requested schema.`;

  const response = await ai.models.generateContent({
    model: CREATIVE_MODEL,
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          baseBpm: { type: Type.NUMBER },
          dominantKey: { type: Type.STRING },
          combinedProgression: { type: Type.STRING },
          suggestedStructure: { type: Type.STRING },
          averageEnergy: { type: Type.NUMBER },
          overallMood: { type: Type.STRING },
          instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
          catchySpice: { type: Type.STRING },
          thematicNarrative: { type: Type.STRING },
          sunoStylePrompt: { type: Type.STRING },
          sunoLyrics: { type: Type.STRING },
        },
        required: [
          "title", "baseBpm", "dominantKey", "combinedProgression", "suggestedStructure",
          "averageEnergy", "overallMood", "instruments", "catchySpice",
          "thematicNarrative", "sunoStylePrompt", "sunoLyrics"
        ],
      },
    },
  });

  return parseGeminiJson<HybridDNA>(response.text);
};

const updateSunoPromptBrowser = async (
  dna: HybridDNA,
  instrumentalOnly: boolean,
  lyricsLanguage: string = "Português",
  soloInstruments?: string[],
  baseInstruments?: string[],
  signal?: AbortSignal
): Promise<{ sunoStylePrompt: string; sunoLyrics: string }> => {
  throwIfAborted(signal);
  const ai = getBrowserAi();
  const sunoGuideUrl = "https://learnprompting.org/blog/guide-suno";
  const { soloText, baseText } = buildInstrumentInstructions(soloInstruments, baseInstruments);

  const prompt = `Update the Suno AI prompt configuration for this Hybrid DNA.
  DNA Info:
  - Title: ${dna.title}
  - BPM: ${dna.baseBpm}
  - Key: ${dna.dominantKey}
  - Mood: ${dna.overallMood}
  - Instruments: ${dna.instruments.join(", ")}
  - Catchy Spice: ${dna.catchySpice}
  - Thematic Narrative: ${dna.thematicNarrative}

  USER INSTRUMENT SELECTIONS:
  - ${soloText}
  - ${baseText}

  Requirements:
  1. Use the Suno Guide at ${sunoGuideUrl} for best practices.
  2. The user has switched to: ${instrumentalOnly ? "INSTRUMENTAL ONLY" : "VOCAL AND INSTRUMENTAL"}.
  3. Generate updated sunoStylePrompt (MAX 300 characters!).
     - If instrumentalOnly is true (currently: ${instrumentalOnly}), do not include vocal instructions. If instrumentalOnly is false, reference vocals in ${lyricsLanguage}.
  4. Generate updated sunoLyrics.
     - If instrumentalOnly is true, only include structure metatags inside square brackets.
     - If vocal, generate full lyrics in ${lyricsLanguage} with metatags and strong rhyme/meter.

  Return a JSON object with keys: sunoStylePrompt, sunoLyrics.`;

  const response = await ai.models.generateContent({
    model: CREATIVE_MODEL,
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sunoStylePrompt: { type: Type.STRING },
          sunoLyrics: { type: Type.STRING },
        },
        required: ["sunoStylePrompt", "sunoLyrics"],
      },
    },
  });

  return parseGeminiJson<{ sunoStylePrompt: string; sunoLyrics: string }>(response.text);
};

const extractTracksFromTextOrUrlBrowser = async (input: string, signal?: AbortSignal): Promise<{ title: string; artist: string }[]> => {
  throwIfAborted(signal);
  const ai = getBrowserAi();
  const prompt = `Analyze the following input, which may be a music playlist URL (Spotify, YouTube Music, Apple Music, Deezer, etc.), a YouTube playlist URL, or a raw list of text/songs.
  Extract up to 10 songs from it.
  For each song, detect its title and artist.

  If the input is a URL of a playlist from a popular service but you cannot access it directly, extract any song/artist names present in the URL itself or infer representative tracks only when the playlist title/theme is clear.
  If the input is plain text containing a list of songs, parse each line to extract the song title and artist correctly.

  Input:
  "${input}"

  Return a JSON array of objects, each containing: "title" and "artist".`;

  const response = await ai.models.generateContent({
    model: COST_OPTIMIZED_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING },
          },
          required: ["title", "artist"],
        },
      },
    },
  });

  return parseGeminiJson<{ title: string; artist: string }[]>(response.text);
};

export const analyzePlaylistDNA = async (tracks: { title: string; artist: string }[], signal?: AbortSignal): Promise<TrackDNA[]> => (
  callServerOrBrowser(
    "/api/gemini/analyze-playlist",
    { tracks },
    signal,
    () => analyzePlaylistDNABrowser(tracks, signal),
    "Erro na análise de playlist. Verifique se sua chave API é válida ou tente novamente mais tarde."
  )
);

export const createHybridDNA = async (
  dnas: TrackDNA[],
  instrumentalOnly: boolean,
  mashupMode: boolean = false,
  lyricsLanguage: string = "Português",
  soloInstruments?: string[],
  baseInstruments?: string[],
  signal?: AbortSignal
): Promise<HybridDNA> => (
  callServerOrBrowser(
    "/api/gemini/create-hybrid",
    { dnas, instrumentalOnly, mashupMode, lyricsLanguage, soloInstruments, baseInstruments },
    signal,
    () => createHybridDNABrowser(dnas, instrumentalOnly, mashupMode, lyricsLanguage, soloInstruments, baseInstruments, signal),
    "Erro ao sintetizar DNA híbrido."
  )
);

export const updateSunoPrompt = async (
  dna: HybridDNA,
  instrumentalOnly: boolean,
  lyricsLanguage: string = "Português",
  soloInstruments?: string[],
  baseInstruments?: string[],
  signal?: AbortSignal
): Promise<{ sunoStylePrompt: string; sunoLyrics: string }> => (
  callServerOrBrowser(
    "/api/gemini/update-prompt",
    { dna, instrumentalOnly, lyricsLanguage, soloInstruments, baseInstruments },
    signal,
    () => updateSunoPromptBrowser(dna, instrumentalOnly, lyricsLanguage, soloInstruments, baseInstruments, signal),
    "Erro ao atualizar prompt do Suno."
  )
);

export const extractTracksFromTextOrUrl = async (input: string, signal?: AbortSignal): Promise<{ title: string; artist: string }[]> => (
  callServerOrBrowser(
    "/api/gemini/extract-tracks",
    { input },
    signal,
    () => extractTracksFromTextOrUrlBrowser(input, signal),
    "Erro ao extrair faixas."
  )
);
