import { GoogleGenAI, Type } from "@google/genai";

const COST_OPTIMIZED_MODEL = "gemini-3.1-flash-lite";
const CREATIVE_MODEL = "gemini-3.5-flash";

const getAi = (clientApiKey?: string) => {
  const apiKey = clientApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("A chave de API Gemini não está configurada no servidor. Por favor, adicione sua própria chave nas configurações.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Retry helper for API rate-limits/503/High-Demand errors with exponential backoff
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = String(error.message || error).toLowerCase();
    const isTransient = errorMsg.includes("503") || 
                      errorMsg.includes("unavailable") || 
                      errorMsg.includes("high demand") ||
                      errorMsg.includes("overloaded");
    
    if (retries > 0 && isTransient) {
      console.warn(`Gemini API transient error detected. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export interface TrackDNA {
  title: string;
  artist: string;
  bpm: number;
  key: string;
  progression: string;
  structure: string;
  energy: number;
  mood: string;
  thematicIdea: string;
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
  sunoStylePrompt: string;
  sunoLyrics: string;
  thematicNarrative: string;
}

export const analyzePlaylistDNAServer = async (tracks: { title: string; artist: string }[], clientApiKey?: string): Promise<TrackDNA[]> => {
  const ai = getAi(clientApiKey);
  const prompt = `Analyze the musical DNA of the following tracks. For each track, provide: BPM, Key, Chord Progression, Structure (e.g., Verse-Chorus), Energy (1-10), Mood, and the "Thematic Idea" (the core message or story of the lyrics/theme).
  
  IMPORTANT: All text fields (Mood, Thematic Idea, Structure) MUST be in Portuguese (PT-BR).
  
  Tracks:
  ${tracks.map((t, i) => `${i + 1}. ${t.title} by ${t.artist}`).join("\n")}
  
  Return the data as a JSON array of objects.`;

  const response = await callWithRetry(() => ai.models.generateContent({
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
  }));

  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }

  return JSON.parse(response.text);
};

export const createHybridDNAServer = async (
  dnas: TrackDNA[], 
  instrumentalOnly: boolean, 
  mashupMode: boolean = false, 
  lyricsLanguage: string = "Português", 
  soloInstruments?: string[],
  baseInstruments?: string[],
  clientApiKey?: string
): Promise<HybridDNA> => {
  const ai = getAi(clientApiKey);
  const catchyUrl = "https://gemini.google.com/gem/caaa9af72be9/6bed029009a4dd1a";
  const sunoGuideUrl = "https://learnprompting.org/blog/guide-suno";
  
  const soloText = soloInstruments && soloInstruments.length > 0 && !soloInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC SOLO INSTRUMENTS: The user wants these specific instruments for solos: ${soloInstruments.join(", ")}. Ensure they are explicitly added to the sunoStylePrompt and included in solo structure tags (e.g. [${soloInstruments[0]} Solo], [Solo de ${soloInstruments[0]}] or similar) in the sunoLyrics.`
    : `SOLO INSTRUMENTS: Let Suno decide or generate automatically based on the original playlist's DNA.`;

  const baseText = baseInstruments && baseInstruments.length > 0 && !baseInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC BACKING/BASE INSTRUMENTS: The user wants these specific instruments for the rhythm/harmonic base: ${baseInstruments.join(", ")}. Ensure they are explicitly added as style/backing arrangement tags in the sunoStylePrompt.`
    : `BACKING/BASE INSTRUMENTS: Synthesize based on the original playlist's style.`;

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
     - MUST BE UNDER 300 CHARACTERS! This is an expanded limit to allow highly detailed musical styles, production nuances, and specific instruments.
     - Include key genre tags, detailed subgenres, precise mood, BPM, Key, specific instruments with their textures (e.g., "dusty vinyl crackle, warm analog synth, airy acoustic guitar"), production styles, and vocal/instrumental settings.
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (which is currently: ${instrumentalOnly}), you MUST NOT include any vocal instructions (e.g., "vocals", "singing", "male/female voice", "singer", "vocals in Portuguese" are STRICTLY FORBIDDEN). Instead, you MUST include tags like "instrumental, no vocals, solo instruments, pure arrangement". If instrumentalOnly is false, ensure the vocal language matches ${lyricsLanguage} (e.g. "vocals in Portuguese").
  6. Create highly optimized Suno Lyrics (sunoLyrics):
     - The user has requested an ${instrumentalOnly ? "INSTRUMENTAL ONLY" : "VOCAL AND INSTRUMENTAL"} track. 
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (which is currently: ${instrumentalOnly}), you MUST NOT write any lyrics, text, poems, speech, chants, or spoken words. The sunoLyrics field MUST ONLY contain structure metatags inside square brackets describing the musical arrangement progression (e.g., [Intro], [Main Theme], [Build-up], [Drop], [Acoustic Guitar Solo], [Synthesizer Melodic Solo], [Violin Solo], [Outro]). Do NOT include any lines of text outside the brackets, otherwise Suno will sing them!
     - If vocal (instrumentalOnly is false), write complete lyrics in ${lyricsLanguage} based on the "Thematic Narrative" of the song, structured beautifully with metatags like [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Outro].
     - CRITICAL LYRICS QUALITY RULES:
       - The lyrics MUST strictly respect and utilize the typical poetic meter, syllable counts, rhythm, and natural cadence of the selected language: ${lyricsLanguage}.
       - Implement a clear, elegant rhyme scheme (such as AABB, ABAB, or other native verse forms) that flows perfectly when sung.
       - The rhymes should be rich, natural, expressive, and fit the mood and energy of the musical DNA perfectly. Avoid forced rhymes or awkward sentence structure.
     - Incorporate the "Golden Progression" or similar catchy elements identified from the first URL.
     ${mashupMode ? "- Since this is a MASHUP, explicitly use style tags like [Mashup], [Remix], [Style Blend] and describe how the different track elements collide." : ""}
  
  Return a single JSON object matching the requested schema.`;

  const response = await callWithRetry(() => ai.models.generateContent({
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
          catchySpice: { type: Type.STRING, description: "The 'spice' that makes the music catchy." },
          thematicNarrative: { type: Type.STRING, description: "Synthesized thematic idea in Portuguese." },
          sunoStylePrompt: { type: Type.STRING, description: "Strictly under 300 characters containing highly detailed style tags, instruments, production techniques, BPM, and Key." },
          sunoLyrics: { type: Type.STRING, description: "Detailed lyrics with structure tags or instrumental arrangement." },
        },
        required: [
          "title", "baseBpm", "dominantKey", "combinedProgression", "suggestedStructure", 
          "averageEnergy", "overallMood", "instruments", "catchySpice", 
          "thematicNarrative", "sunoStylePrompt", "sunoLyrics"
        ],
      },
    },
  }));

  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }

  return JSON.parse(response.text);
};

export const updateSunoPromptServer = async (
  dna: HybridDNA, 
  instrumentalOnly: boolean, 
  lyricsLanguage: string = "Português", 
  soloInstruments?: string[],
  baseInstruments?: string[],
  clientApiKey?: string
): Promise<{ sunoStylePrompt: string; sunoLyrics: string }> => {
  const ai = getAi(clientApiKey);
  const sunoGuideUrl = "https://learnprompting.org/blog/guide-suno";
  
  const soloText = soloInstruments && soloInstruments.length > 0 && !soloInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC SOLO INSTRUMENTS: The user wants these specific instruments for solos: ${soloInstruments.join(", ")}. Ensure they are explicitly added to the sunoStylePrompt and included in solo structure tags (e.g. [${soloInstruments[0]} Solo], [Solo de ${soloInstruments[0]}] or similar) in the sunoLyrics.`
    : `SOLO INSTRUMENTS: Let Suno decide or generate automatically based on the original playlist's DNA.`;

  const baseText = baseInstruments && baseInstruments.length > 0 && !baseInstruments.includes("Automático pelo SUNO")
    ? `SPECIFIC BACKING/BASE INSTRUMENTS: The user wants these specific instruments for the rhythm/harmonic base: ${baseInstruments.join(", ")}. Ensure they are explicitly added as style/backing arrangement tags in the sunoStylePrompt.`
    : `BACKING/BASE INSTRUMENTS: Synthesize based on the original playlist's style.`;

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
  3. Generate updated sunoStylePrompt (MAX 300 characters!). It must include precise style blends, production nuances, detailed textures, mood, BPM, Key, and custom vocal/instrumental styles.
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (currently: ${instrumentalOnly}), you MUST NOT include any vocal instructions (e.g., "vocals", "singing", "voice", "singer" are FORBIDDEN). Instead, you MUST include tags like "instrumental, no vocals, solo instruments, pure arrangement". If instrumentalOnly is false, ensure it references vocals in ${lyricsLanguage}.
  4. Generate updated sunoLyrics. 
     - CRITICAL INSTRUMENTAL RULE: If instrumentalOnly is true (currently: ${instrumentalOnly}), you MUST NOT write any lyrics, text, poems, speech, chants, or spoken words. The sunoLyrics field MUST ONLY contain structure metatags inside square brackets describing the musical arrangement progression (e.g., [Intro], [Main Theme], [Solo], [Drop], [Build-up], [Acoustic Guitar Solo], [Outro]). Do NOT include any lines of text outside the brackets, otherwise Suno will sing them!
     - If vocal (instrumentalOnly is false), generate full lyrics in ${lyricsLanguage} with metatags like [Verse 1], [Chorus], [Bridge], [Outro] based on the narrative.
     - CRITICAL LYRICS QUALITY RULES:
       - The lyrics MUST strictly respect and utilize the typical poetic meter, syllable counts, rhythm, and natural cadence of the selected language: ${lyricsLanguage}.
       - Implement a clear, elegant rhyme scheme (such as AABB, ABAB, or other native verse forms) that flows perfectly when sung.
       - The rhymes should be rich, natural, expressive, and fit the mood and energy of the musical DNA perfectly. Avoid forced rhymes or awkward sentence structure.
  
  Return a JSON object with keys: sunoStylePrompt, sunoLyrics.`;

  const response = await callWithRetry(() => ai.models.generateContent({
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
  }));

  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }

  return JSON.parse(response.text);
};

export const extractTracksFromTextOrUrlServer = async (input: string, clientApiKey?: string): Promise<{ title: string; artist: string }[]> => {
  const ai = getAi(clientApiKey);
  const prompt = `Analyze the following input, which may be a music playlist URL (Spotify, YouTube Music, Apple Music, Deezer, etc.), a YouTube playlist URL, or a raw list of text/songs.
  Extract up to 10 songs from it.
  For each song, detect its title and artist.
  
  If the input is a URL of a playlist from a popular service (like Spotify, Apple Music, Deezer, YouTube Music, YouTube), but you cannot access it directly, use your knowledge base or semantic search to guess or generate 6-10 iconic tracks or representative songs that fit the typical genre, theme, or name of such a playlist if possible, or extract any song/artist names present in the URL itself. 
  If the input is plain text containing a list of songs, parse each line to extract the song title and artist correctly.
  
  Input:
  "${input}"
  
  Return a JSON array of objects, each containing: "title" and "artist".`;

  const response = await callWithRetry(() => ai.models.generateContent({
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
  }));

  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }

  return JSON.parse(response.text);
};
