var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");

// src/lib/geminiServer.ts
var import_genai = require("@google/genai");
var COST_OPTIMIZED_MODEL = "gemini-3.1-flash-lite";
var CREATIVE_MODEL = COST_OPTIMIZED_MODEL;
var ADVANCED_CREATIVE_MODEL = "gemini-3.5-flash";
var CREATIVE_FALLBACK_MODEL = "gemini-2.5-flash-lite";
var TRANSIENT_GEMINI_MESSAGE = "O modelo Gemini esta temporariamente congestionado. Aguarde 1 ou 2 minutos e tente novamente; sua chave esta ok, e esse erro costuma ser momentaneo.";
var QUOTA_GEMINI_MESSAGE = "A cota da API Gemini parece ter sido atingida para esta chave/projeto. Verifique os limites no Google AI Studio ou tente outra chave.";
var getAi = (clientApiKey) => {
  const apiKey = clientApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("A chave de API Gemini n\xE3o est\xE1 configurada no servidor. Por favor, adicione sua pr\xF3pria chave nas configura\xE7\xF5es.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
var getErrorText = (error) => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return String(parsed?.error?.message || parsed?.message || raw);
    } catch {
      return raw;
    }
  }
  return raw;
};
var isTransientGeminiError = (error) => {
  const text = getErrorText(error).toLowerCase();
  return text.includes("503") || text.includes("unavailable") || text.includes("high demand") || text.includes("overloaded") || text.includes("temporarily") || text.includes("temporariamente") || text.includes("congestionado");
};
var isQuotaGeminiError = (error) => {
  const text = getErrorText(error).toLowerCase();
  return text.includes("429") || text.includes("quota") || text.includes("rate limit") || text.includes("resource_exhausted") || text.includes("too many requests");
};
var getFriendlyGeminiErrorMessage = (error, fallbackMessage) => {
  if (isTransientGeminiError(error)) {
    return TRANSIENT_GEMINI_MESSAGE;
  }
  if (isQuotaGeminiError(error)) {
    return QUOTA_GEMINI_MESSAGE;
  }
  return getErrorText(error) || fallbackMessage;
};
var toFriendlyGeminiError = (error, fallbackMessage) => {
  const friendly = new Error(getFriendlyGeminiErrorMessage(error, fallbackMessage));
  if (isTransientGeminiError(error)) {
    friendly.statusCode = 503;
  } else if (isQuotaGeminiError(error)) {
    friendly.statusCode = 429;
  }
  return friendly;
};
var callWithRetry = async (fn, retries = 3, delay = 1500) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isTransientGeminiError(error)) {
      console.warn(`Gemini API transient error detected. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};
var callGeminiWithRetry = async (primary, fallback) => {
  try {
    return await callWithRetry(primary);
  } catch (error) {
    if (fallback && isTransientGeminiError(error)) {
      try {
        console.warn(`Gemini API transient error on ${CREATIVE_MODEL}. Trying ${CREATIVE_FALLBACK_MODEL}.`);
        return await callWithRetry(fallback, 2, 2e3);
      } catch (fallbackError) {
        throw toFriendlyGeminiError(fallbackError, TRANSIENT_GEMINI_MESSAGE);
      }
    }
    throw toFriendlyGeminiError(error, "Erro ao chamar a API Gemini.");
  }
};
var analyzePlaylistDNAServer = async (tracks, clientApiKey) => {
  const ai = getAi(clientApiKey);
  const prompt = `Analyze the musical DNA of the following tracks. For each track, provide: BPM, Key, Chord Progression, Structure (e.g., Verse-Chorus), Energy (1-10), Mood, and the "Thematic Idea" (the core message or story of the lyrics/theme).
  
  IMPORTANT: All text fields (Mood, Thematic Idea, Structure) MUST be in Portuguese (PT-BR).
  
  Tracks:
  ${tracks.map((t, i) => `${i + 1}. ${t.title} by ${t.artist}`).join("\n")}
  
  Return the data as a JSON array of objects.`;
  const response = await callGeminiWithRetry(() => ai.models.generateContent({
    model: COST_OPTIMIZED_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            title: { type: import_genai.Type.STRING },
            artist: { type: import_genai.Type.STRING },
            bpm: { type: import_genai.Type.NUMBER },
            key: { type: import_genai.Type.STRING },
            progression: { type: import_genai.Type.STRING },
            structure: { type: import_genai.Type.STRING },
            energy: { type: import_genai.Type.NUMBER },
            mood: { type: import_genai.Type.STRING },
            thematicIdea: { type: import_genai.Type.STRING }
          },
          required: ["title", "artist", "bpm", "key", "progression", "structure", "energy", "mood", "thematicIdea"]
        }
      }
    }
  }));
  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }
  return JSON.parse(response.text);
};
var createHybridDNAServer = async (dnas, instrumentalOnly, mashupMode = false, lyricsLanguage = "Portugu\xEAs", soloInstruments, baseInstruments, clientApiKey, useAdvancedModel = false) => {
  const ai = getAi(clientApiKey);
  const creativeModel = useAdvancedModel ? ADVANCED_CREATIVE_MODEL : CREATIVE_MODEL;
  const soloText = soloInstruments && soloInstruments.length > 0 && !soloInstruments.includes("Autom\xE1tico pelo SUNO") ? `SPECIFIC SOLO INSTRUMENTS: The user wants these specific instruments for solos: ${soloInstruments.join(", ")}. Ensure they are explicitly added to the sunoStylePrompt and included in solo structure tags (e.g. [${soloInstruments[0]} Solo], [Solo de ${soloInstruments[0]}] or similar) in the sunoLyrics.` : `SOLO INSTRUMENTS: Let Suno decide or generate automatically based on the original playlist's DNA.`;
  const baseText = baseInstruments && baseInstruments.length > 0 && !baseInstruments.includes("Autom\xE1tico pelo SUNO") ? `SPECIFIC BACKING/BASE INSTRUMENTS: The user wants these specific instruments for the rhythm/harmonic base: ${baseInstruments.join(", ")}. Ensure they are explicitly added as style/backing arrangement tags in the sunoStylePrompt.` : `BACKING/BASE INSTRUMENTS: Synthesize based on the original playlist's style.`;
  const prompt = `Based on the following musical DNAs, create a single "Hybrid DNA" that combines their best elements into a new, cohesive musical profile.
  
  DNAs:
  ${JSON.stringify(dnas, null, 2)}
  
  IMPORTANT: All descriptive fields (overallMood, catchySpice, thematicNarrative, instruments, title) MUST be in Portuguese (PT-BR).
  
  ${mashupMode ? "SPECIAL INSTRUCTION: MASHUP MODE IS ON. The goal is to create a 'Mashup' or 'Remix' style that aggressively blends the contrasting styles of the source tracks. The resulting prompt should feel like a creative collision of these tracks." : ""}

  USER INSTRUMENT SELECTIONS:
  - ${soloText}
  - ${baseText}

  Also:
  1. Identify the "catchy spice" (elements that make a song catchy/pegajosa), specifically looking for strong progressions, memorable hooks, contrast, repetition, and other factors that make music addictive.
  2. Apply Suno prompt best practices using metatags (like [Verse], [Chorus], [Bridge], [Outro]), style tags, and proper structure. Do not fetch external URLs; rely on built-in musical and prompt-engineering knowledge.
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
     - Incorporate a strong catchy progression, recurring hook, or similar sticky musical element identified from the input DNA.
     ${mashupMode ? "- Since this is a MASHUP, explicitly use style tags like [Mashup], [Remix], [Style Blend] and describe how the different track elements collide." : ""}
  
  Return a single JSON object matching the requested schema.`;
  const generateHybrid = (model) => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai.Type.OBJECT,
        properties: {
          title: { type: import_genai.Type.STRING },
          baseBpm: { type: import_genai.Type.NUMBER },
          dominantKey: { type: import_genai.Type.STRING },
          combinedProgression: { type: import_genai.Type.STRING },
          suggestedStructure: { type: import_genai.Type.STRING },
          averageEnergy: { type: import_genai.Type.NUMBER },
          overallMood: { type: import_genai.Type.STRING },
          instruments: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
          catchySpice: { type: import_genai.Type.STRING, description: "The 'spice' that makes the music catchy." },
          thematicNarrative: { type: import_genai.Type.STRING, description: "Synthesized thematic idea in Portuguese." },
          sunoStylePrompt: { type: import_genai.Type.STRING, description: "Strictly under 300 characters containing highly detailed style tags, instruments, production techniques, BPM, and Key." },
          sunoLyrics: { type: import_genai.Type.STRING, description: "Detailed lyrics with structure tags or instrumental arrangement." }
        },
        required: [
          "title",
          "baseBpm",
          "dominantKey",
          "combinedProgression",
          "suggestedStructure",
          "averageEnergy",
          "overallMood",
          "instruments",
          "catchySpice",
          "thematicNarrative",
          "sunoStylePrompt",
          "sunoLyrics"
        ]
      }
    }
  });
  const response = await callGeminiWithRetry(
    () => generateHybrid(creativeModel),
    () => generateHybrid(CREATIVE_FALLBACK_MODEL)
  );
  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }
  return JSON.parse(response.text);
};
var updateSunoPromptServer = async (dna, instrumentalOnly, lyricsLanguage = "Portugu\xEAs", soloInstruments, baseInstruments, clientApiKey, useAdvancedModel = false) => {
  const ai = getAi(clientApiKey);
  const creativeModel = useAdvancedModel ? ADVANCED_CREATIVE_MODEL : CREATIVE_MODEL;
  const soloText = soloInstruments && soloInstruments.length > 0 && !soloInstruments.includes("Autom\xE1tico pelo SUNO") ? `SPECIFIC SOLO INSTRUMENTS: The user wants these specific instruments for solos: ${soloInstruments.join(", ")}. Ensure they are explicitly added to the sunoStylePrompt and included in solo structure tags (e.g. [${soloInstruments[0]} Solo], [Solo de ${soloInstruments[0]}] or similar) in the sunoLyrics.` : `SOLO INSTRUMENTS: Let Suno decide or generate automatically based on the original playlist's DNA.`;
  const baseText = baseInstruments && baseInstruments.length > 0 && !baseInstruments.includes("Autom\xE1tico pelo SUNO") ? `SPECIFIC BACKING/BASE INSTRUMENTS: The user wants these specific instruments for the rhythm/harmonic base: ${baseInstruments.join(", ")}. Ensure they are explicitly added as style/backing arrangement tags in the sunoStylePrompt.` : `BACKING/BASE INSTRUMENTS: Synthesize based on the original playlist's style.`;
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
  1. Apply Suno prompt best practices using built-in musical and prompt-engineering knowledge. Do not fetch external URLs.
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
  const updatePrompt = (model) => ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai.Type.OBJECT,
        properties: {
          sunoStylePrompt: { type: import_genai.Type.STRING },
          sunoLyrics: { type: import_genai.Type.STRING }
        },
        required: ["sunoStylePrompt", "sunoLyrics"]
      }
    }
  });
  const response = await callGeminiWithRetry(
    () => updatePrompt(creativeModel),
    () => updatePrompt(CREATIVE_FALLBACK_MODEL)
  );
  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }
  return JSON.parse(response.text);
};
var extractTracksFromTextOrUrlServer = async (input, clientApiKey) => {
  const ai = getAi(clientApiKey);
  const prompt = `Analyze the following input, which may be a music playlist URL (Spotify, YouTube Music, Apple Music, Deezer, etc.), a YouTube playlist URL, or a raw list of text/songs.
  Extract up to 10 songs from it.
  For each song, detect its title and artist.
  
  If the input is a URL of a playlist from a popular service (like Spotify, Apple Music, Deezer, YouTube Music, YouTube), but you cannot access it directly, use your knowledge base or semantic search to guess or generate 6-10 iconic tracks or representative songs that fit the typical genre, theme, or name of such a playlist if possible, or extract any song/artist names present in the URL itself. 
  If the input is plain text containing a list of songs, parse each line to extract the song title and artist correctly.
  
  Input:
  "${input}"
  
  Return a JSON array of objects, each containing: "title" and "artist".`;
  const response = await callGeminiWithRetry(() => ai.models.generateContent({
    model: COST_OPTIMIZED_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai.Type.ARRAY,
        items: {
          type: import_genai.Type.OBJECT,
          properties: {
            title: { type: import_genai.Type.STRING },
            artist: { type: import_genai.Type.STRING }
          },
          required: ["title", "artist"]
        }
      }
    }
  }));
  if (!response.text) {
    throw new Error("A API do Gemini retornou uma resposta vazia.");
  }
  return JSON.parse(response.text);
};

// server.ts
var import_meta = {};
var sendApiError = (res, error, fallbackMessage) => {
  const statusCode = Number(error?.statusCode) || 500;
  res.status(statusCode).json({ error: error?.message || fallbackMessage });
};
var filename = "";
var dirname = "";
try {
  if (typeof import_meta !== "undefined" && import_meta.url) {
    filename = (0, import_url.fileURLToPath)(import_meta.url);
    dirname = import_path.default.dirname(filename);
  }
} catch (e) {
  filename = typeof __filename !== "undefined" ? __filename : "";
  dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/gemini/analyze-playlist", async (req, res) => {
    try {
      const { tracks } = req.body;
      if (!tracks || !Array.isArray(tracks)) {
        res.status(400).json({ error: "Lista de faixas inv\xE1lida ou ausente." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"];
      const dnas = await analyzePlaylistDNAServer(tracks, clientApiKey);
      res.json(dnas);
    } catch (error) {
      console.error("Error in /api/gemini/analyze-playlist:", error);
      sendApiError(res, error, "Erro ao analisar o DNA da playlist.");
    }
  });
  app.post("/api/gemini/create-hybrid", async (req, res) => {
    try {
      const { dnas, instrumentalOnly, mashupMode, lyricsLanguage, soloInstruments, baseInstruments } = req.body;
      if (!dnas || !Array.isArray(dnas)) {
        res.status(400).json({ error: "DNAs de origem inv\xE1lidos ou ausentes." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"];
      const useAdvancedModel = req.headers["x-gemini-use-advanced-model"] === "true";
      const hybrid = await createHybridDNAServer(
        dnas,
        !!instrumentalOnly,
        !!mashupMode,
        lyricsLanguage || "Portugu\xEAs",
        soloInstruments,
        baseInstruments,
        clientApiKey,
        useAdvancedModel
      );
      res.json(hybrid);
    } catch (error) {
      console.error("Error in /api/gemini/create-hybrid:", error);
      sendApiError(res, error, "Erro ao criar DNA hibrido.");
    }
  });
  app.post("/api/gemini/update-prompt", async (req, res) => {
    try {
      const { dna, instrumentalOnly, lyricsLanguage, soloInstruments, baseInstruments } = req.body;
      if (!dna) {
        res.status(400).json({ error: "Dados do DNA ausentes." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"];
      const useAdvancedModel = req.headers["x-gemini-use-advanced-model"] === "true";
      const updated = await updateSunoPromptServer(
        dna,
        !!instrumentalOnly,
        lyricsLanguage || "Portugu\xEAs",
        soloInstruments,
        baseInstruments,
        clientApiKey,
        useAdvancedModel
      );
      res.json(updated);
    } catch (error) {
      console.error("Error in /api/gemini/update-prompt:", error);
      sendApiError(res, error, "Erro ao atualizar prompt do Suno.");
    }
  });
  app.post("/api/gemini/extract-tracks", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input || typeof input !== "string") {
        res.status(400).json({ error: "Texto de entrada inv\xE1lido ou ausente." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"];
      const tracks = await extractTracksFromTextOrUrlServer(input, clientApiKey);
      res.json(tracks);
    } catch (error) {
      console.error("Error in /api/gemini/extract-tracks:", error);
      sendApiError(res, error, "Erro ao extrair musicas.");
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
