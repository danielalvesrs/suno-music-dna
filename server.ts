import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import {
  analyzePlaylistDNAServer,
  createHybridDNAServer,
  updateSunoPromptServer,
  extractTracksFromTextOrUrlServer
} from "./src/lib/geminiServer";

const sendApiError = (res: express.Response, error: any, fallbackMessage: string) => {
  const statusCode = Number(error?.statusCode) || 500;
  res.status(statusCode).json({ error: error?.message || fallbackMessage });
};

let filename = "";
let dirname = "";
try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    filename = fileURLToPath(import.meta.url);
    dirname = path.dirname(filename);
  }
} catch (e) {
  // Safe fallback for CommonJS bundles
  filename = typeof __filename !== "undefined" ? __filename : "";
  dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Analyze Playlist DNA Route
  app.post("/api/gemini/analyze-playlist", async (req, res) => {
    try {
      const { tracks } = req.body;
      if (!tracks || !Array.isArray(tracks)) {
        res.status(400).json({ error: "Lista de faixas inválida ou ausente." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const dnas = await analyzePlaylistDNAServer(tracks, clientApiKey);
      res.json(dnas);
    } catch (error: any) {
      console.error("Error in /api/gemini/analyze-playlist:", error);
      sendApiError(res, error, "Erro ao analisar o DNA da playlist.");
    }
  });

  // 2. Create Hybrid DNA Route
  app.post("/api/gemini/create-hybrid", async (req, res) => {
    try {
      const { dnas, instrumentalOnly, mashupMode, lyricsLanguage, soloInstruments, baseInstruments } = req.body;
      if (!dnas || !Array.isArray(dnas)) {
        res.status(400).json({ error: "DNAs de origem inválidos ou ausentes." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const useAdvancedModel = req.headers["x-gemini-use-advanced-model"] === "true";
      const hybrid = await createHybridDNAServer(
        dnas, 
        !!instrumentalOnly, 
        !!mashupMode, 
        lyricsLanguage || "Português", 
        soloInstruments, 
        baseInstruments, 
        clientApiKey,
        useAdvancedModel
      );
      res.json(hybrid);
    } catch (error: any) {
      console.error("Error in /api/gemini/create-hybrid:", error);
      sendApiError(res, error, "Erro ao criar DNA hibrido.");
    }
  });

  // 3. Update Suno Prompt Route
  app.post("/api/gemini/update-prompt", async (req, res) => {
    try {
      const { dna, instrumentalOnly, lyricsLanguage, soloInstruments, baseInstruments } = req.body;
      if (!dna) {
        res.status(400).json({ error: "Dados do DNA ausentes." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const useAdvancedModel = req.headers["x-gemini-use-advanced-model"] === "true";
      const updated = await updateSunoPromptServer(
        dna, 
        !!instrumentalOnly, 
        lyricsLanguage || "Português", 
        soloInstruments, 
        baseInstruments, 
        clientApiKey,
        useAdvancedModel
      );
      res.json(updated);
    } catch (error: any) {
      console.error("Error in /api/gemini/update-prompt:", error);
      sendApiError(res, error, "Erro ao atualizar prompt do Suno.");
    }
  });

  // 4. Extract Tracks Route
  app.post("/api/gemini/extract-tracks", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input || typeof input !== "string") {
        res.status(400).json({ error: "Texto de entrada inválido ou ausente." });
        return;
      }
      const clientApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const tracks = await extractTracksFromTextOrUrlServer(input, clientApiKey);
      res.json(tracks);
    } catch (error: any) {
      console.error("Error in /api/gemini/extract-tracks:", error);
      sendApiError(res, error, "Erro ao extrair musicas.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
