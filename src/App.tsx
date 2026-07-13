import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dna, 
  Music, 
  Zap, 
  Layers, 
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  History,
  BarChart3,
  Library,
  X,
  TrendingUp,
  Award,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Settings,
  Key
} from "lucide-react";
import confetti from "canvas-confetti";
import PlaylistInput from "./components/PlaylistInput";
import { InstrumentSelector } from "./components/InstrumentSelector";
import { 
  analyzePlaylistDNA, 
  createHybridDNA, 
  updateSunoPrompt,
  TrackDNA,
  HybridDNA 
} from "./lib/gemini";

const LANGUAGES = [
  { code: "Português", name: "Português", flag: "🇧🇷", desc: "Métrica de Redondilhas & Rima Rica" },
  { code: "Inglês", name: "Inglês", flag: "🇺🇸", desc: "Iambic Pentameter & Slant Rhymes" },
  { code: "Espanhol", name: "Espanhol", flag: "🇪🇸", desc: "Rima Asonante y Consonante" },
  { code: "Francês", name: "Francês", flag: "🇫🇷", desc: "Alexandrin & Métrique Cadencée" },
  { code: "Italiano", name: "Italiano", flag: "🇮🇹", desc: "Endecasillabo & Rima Alternata" },
  { code: "Japonês", name: "Japonês", flag: "🇯🇵", desc: "Métrica de Sílabas (5-7-5) & Poesia" },
  { code: "Alemão", name: "Alemão", flag: "🇩🇪", desc: "Knittelvers & Reimschema" }
];

interface HistoryItem {
  id: string;
  timestamp: number;
  hybridDNA: HybridDNA;
  tracks: { title: string; artist: string; thumbnail?: string }[];
}

interface AppStats {
  totalDNAsCreated: number;
  totalPromptsCopied: number;
}

export default function App() {
  const [tracks, setTracks] = useState<{ title: string; artist: string; thumbnail?: string }[]>([]);
  const [trackDNAs, setTrackDNAs] = useState<TrackDNA[]>([]);
  const [hybridDNA, setHybridDNA] = useState<HybridDNA | null>(null);
  const [withVocals, setWithVocals] = useState(true);
  const [mashupMode, setMashupMode] = useState(false);
  const [lyricsLanguage, setLyricsLanguage] = useState("Português");
  const [selectedSoloInstruments, setSelectedSoloInstruments] = useState<string[]>([]);
  const [selectedBaseInstruments, setSelectedBaseInstruments] = useState<string[]>([]);
  
  // History and Stats States
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('music_dna_history_suno');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar histórico do localStorage:", e);
      return [];
    }
  });

  const [stats, setStats] = useState<AppStats>(() => {
    try {
      const saved = localStorage.getItem('music_dna_stats_suno');
      return saved ? JSON.parse(saved) : {
        totalDNAsCreated: 0,
        totalPromptsCopied: 0
      };
    } catch (e) {
      console.error("Erro ao carregar estatísticas do localStorage:", e);
      return {
        totalDNAsCreated: 0,
        totalPromptsCopied: 0
      };
    }
  });

  const [activePanel, setActivePanel] = useState<'history' | 'stats' | 'library' | 'help' | 'settings' | null>(null);

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_gemini_api_key') || "";
    } catch (e) {
      return "";
    }
  });

  const [hasCustomKey, setHasCustomKey] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('user_gemini_api_key');
    } catch (e) {
      return false;
    }
  });

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hide_welcome_modal_suno') !== 'true';
    } catch (e) {
      return true;
    }
  });

  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const [step, setStep] = useState<"input" | "analyzing" | "hybridizing" | "updating" | "result">("input");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const [copiedStyle, setCopiedStyle] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setError(null);
    setStep("input");
  };

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('music_dna_history_suno', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('music_dna_stats_suno', JSON.stringify(stats));
  }, [stats]);

  const handleTracksFound = async (foundTracks: typeof tracks) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTracks(foundTracks);
    setStep("analyzing");
    setStatus("Iniciando extração de DNA musical...");
    setError(null);

    try {
      setStatus(`Analisando ${foundTracks.length} faixas para extrair BPM, tom e energia...`);
      const dnas = await analyzePlaylistDNA(foundTracks, controller.signal);
      setTrackDNAs(dnas);
      
      setStep("hybridizing");
      setStatus("Combinando perfis musicais em um DNA híbrido único...");
      const hybrid = await createHybridDNA(dnas, !withVocals, mashupMode, lyricsLanguage, selectedSoloInstruments, selectedBaseInstruments, controller.signal);
      setHybridDNA(hybrid);
      
      // Save to History and Update Stats
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        hybridDNA: hybrid,
        tracks: foundTracks,
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setStats(prev => ({
        totalDNAsCreated: prev.totalDNAsCreated + 1,
        totalPromptsCopied: prev.totalPromptsCopied
      }));

      setStatus("DNA Híbrido sintetizado com sucesso!");
      setStep("result");
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fbbf24', '#ffffff']
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Análise cancelada pelo usuário.");
        return;
      }
      console.error(err);
      setError(err.message || "Falha ao analisar a playlist e criar o DNA.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleCopyPrompt = (text: string, type: 'style' | 'lyrics') => {
    navigator.clipboard.writeText(text);
    if (type === 'style') {
      setCopiedStyle(true);
      setTimeout(() => setCopiedStyle(false), 2000);
    } else {
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 2000);
    }
    setStats(prev => ({
      ...prev,
      totalPromptsCopied: prev.totalPromptsCopied + 1
    }));
  };

  const toggleVocals = async () => {
    if (!hybridDNA) return;
    const newWithVocals = !withVocals;
    setWithVocals(newWithVocals);
    
    setStep("updating");
    setStatus("Atualizando prompts e letras para o modo " + (newWithVocals ? "Vocal" : "Instrumental") + "...");
    
    try {
      const updated = await updateSunoPrompt(hybridDNA, !newWithVocals, lyricsLanguage, selectedSoloInstruments, selectedBaseInstruments);
      setHybridDNA({
        ...hybridDNA,
        sunoStylePrompt: updated.sunoStylePrompt,
        sunoLyrics: updated.sunoLyrics
      });
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao atualizar o prompt do Suno.");
      setStep("result");
    }
  };

  const handleMashupToggle = async () => {
    if (tracks.length === 0) return;
    const newValue = !mashupMode;
    setMashupMode(newValue);
    
    // Regenerate DNA from scratch
    setStep("hybridizing");
    setStatus("Regerando o DNA híbrido com o modo Mashup " + (newValue ? "ATIVADO" : "DESATIVADO") + "...");
    try {
      const hybrid = await createHybridDNA(trackDNAs, !withVocals, newValue, lyricsLanguage, selectedSoloInstruments, selectedBaseInstruments);
      setHybridDNA(hybrid);
      
      setStats(prev => ({
        ...prev,
        totalDNAsCreated: prev.totalDNAsCreated + 1
      }));
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao regerar o DNA híbrido.");
      setStep("result");
    }
  };

  const handleLanguageChange = async (newLang: string) => {
    if (!hybridDNA) return;
    setLyricsLanguage(newLang);
    
    setStep("updating");
    setStatus(`Adaptando rimas, métricas poéticas e reescrevendo letra em ${newLang}...`);
    try {
      const updated = await updateSunoPrompt(hybridDNA, !withVocals, newLang, selectedSoloInstruments, selectedBaseInstruments);
      setHybridDNA({
        ...hybridDNA,
        sunoStylePrompt: updated.sunoStylePrompt,
        sunoLyrics: updated.sunoLyrics
      });
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao atualizar o idioma da letra.");
      setStep("result");
    }
  };

  const handleInstrumentsChange = async (newSolo: string[], newBase: string[]) => {
    if (!hybridDNA) return;
    setSelectedSoloInstruments(newSolo);
    setSelectedBaseInstruments(newBase);
    
    setStep("updating");
    setStatus("Atualizando arranjo e prompt do SUNO com novos instrumentos...");
    try {
      const updated = await updateSunoPrompt(hybridDNA, !withVocals, lyricsLanguage, newSolo, newBase);
      setHybridDNA({
        ...hybridDNA,
        sunoStylePrompt: updated.sunoStylePrompt,
        sunoLyrics: updated.sunoLyrics
      });
      setStep("result");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao atualizar o prompt com os novos instrumentos.");
      setStep("result");
    }
  };

  const reset = () => {
    setTracks([]);
    setTrackDNAs([]);
    setHybridDNA(null);
    setStep("input");
    setStatus("");
    setError(null);
  };

  const getAlchemistLevel = () => {
    const total = stats.totalDNAsCreated;
    if (total >= 15) return { title: "Mestre Supremo", next: "Nível Máximo", progress: 100 };
    if (total >= 8) return { title: "Sintetizador Avançado", next: "15 gerações para Mestre", progress: (total / 15) * 100 };
    if (total >= 3) return { title: "Alquimista do Ritmo", next: "8 gerações para Avançado", progress: (total / 8) * 100 };
    return { title: "Iniciante Musical", next: "3 gerações para Alquimista", progress: (total / 3) * 100 };
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-orange-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={reset}>
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
              <Dna size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">
              SUNO Music DNA <span className="text-orange-500">Hybridizer</span>
            </h1>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <button 
              onClick={() => setActivePanel('settings')}
              className={`flex items-center gap-2 hover:text-orange-500 transition-colors relative cursor-pointer ${activePanel === 'settings' ? 'text-orange-500 font-semibold' : ''}`}
              id="settings-btn"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Chave API</span>
              {hasCustomKey && (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            <button 
              onClick={() => setActivePanel('help')}
              className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${activePanel === 'help' ? 'text-orange-500 font-semibold' : ''}`}
              id="help-btn"
            >
              <HelpCircle size={18} />
              <span className="hidden sm:inline">Como Funciona?</span>
            </button>
            <button 
              onClick={() => setActivePanel('history')}
              className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${activePanel === 'history' ? 'text-orange-500 font-semibold' : ''}`}
              id="history-btn"
            >
              <History size={18} />
              <span className="hidden sm:inline">Histórico</span>
            </button>
            <button 
              onClick={() => setActivePanel('stats')}
              className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${activePanel === 'stats' ? 'text-orange-500 font-semibold' : ''}`}
              id="stats-btn"
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Estatísticas</span>
            </button>
            <button 
              onClick={() => setActivePanel('library')}
              className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${activePanel === 'library' ? 'text-orange-500 font-semibold' : ''}`}
              id="library-btn"
            >
              <Library size={18} />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>
          </div>
        </div>
      </header>

      {/* Side Panels */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
              id="sidebar-overlay"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
              id="sidebar-container"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                    {activePanel === 'history' && <History size={24} />}
                    {activePanel === 'stats' && <BarChart3 size={24} />}
                    {activePanel === 'library' && <Library size={24} />}
                    {activePanel === 'help' && <HelpCircle size={24} />}
                    {activePanel === 'settings' && <Settings size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg capitalize">
                      {activePanel === 'history' ? 'Histórico de DNA' : 
                       activePanel === 'stats' ? 'Estatísticas de Alquimia' : 
                       activePanel === 'library' ? 'Biblioteca de DNA' :
                       activePanel === 'help' ? 'Como funciona?' :
                       'Chave de API Gemini'}
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      {activePanel === 'settings' ? 'Controle de Cota & Limites' : 'Armazenamento Local'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActivePanel(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activePanel === 'history' && (
                  <div className="space-y-4">
                    {history.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                          <History size={32} />
                        </div>
                        <p className="text-gray-400 text-sm">Nenhuma hibridização encontrada.</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(item.timestamp).toLocaleDateString()} às {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase">
                              Suno AI Ready
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm">
                              <Music size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate">{item.hybridDNA.title || `Hybrid DNA #${item.id.slice(0, 4)}`}</p>
                              <p className="text-xs text-gray-400 truncate">{item.tracks.length} faixas combinadas</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setHybridDNA(item.hybridDNA);
                                setTracks(item.tracks);
                                setStep('result');
                                setActivePanel(null);
                              }}
                              className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:border-orange-500 hover:text-orange-500 transition-all cursor-pointer"
                            >
                              Carregar Perfil
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activePanel === 'stats' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-1">
                        <TrendingUp className="text-orange-500 mb-2" size={20} />
                        <p className="text-2xl font-black text-orange-900">{stats.totalDNAsCreated}</p>
                        <p className="text-[10px] font-bold text-orange-600 uppercase">DNAs Criados</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
                        <Copy className="text-blue-500 mb-2" size={20} />
                        <p className="text-2xl font-black text-blue-900">{stats.totalPromptsCopied}</p>
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Prompts Copiados</p>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-900 rounded-3xl text-white space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                          <Award size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold">{getAlchemistLevel().title}</h4>
                          <p className="text-xs text-gray-400">Classificação de Alquimia</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Progresso do Nível</span>
                          <span>{Math.floor(getAlchemistLevel().progress)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 transition-all duration-1000" 
                            style={{ width: `${getAlchemistLevel().progress}%` }}
                          ></div>
                        </div>
                        <p className="text-[10px] text-gray-500 italic">{getAlchemistLevel().next}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activePanel === 'library' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Biblioteca de Criações</h4>
                    {history.length === 0 ? (
                      <p className="text-center py-12 text-gray-400 text-sm italic">Sua biblioteca está vazia.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {history.map(item => (
                          <div key={item.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                <Dna size={24} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{item.hybridDNA.title}</p>
                                <p className="text-[10px] text-gray-400 font-mono uppercase">{item.hybridDNA.dominantKey} • {item.hybridDNA.baseBpm} BPM</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setHybridDNA(item.hybridDNA);
                                  setTracks(item.tracks);
                                  setStep('result');
                                  setActivePanel(null);
                                }}
                                className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all cursor-pointer"
                              >
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activePanel === 'help' && (
                  <div className="space-y-6 text-sm text-gray-600 leading-relaxed pb-8">
                    <p className="font-semibold text-gray-800 text-sm">
                      Já que a inteligência artificial não "ouve" os arquivos de áudio diretamente, como o algoritmo mapeia o DNA musical?
                    </p>
                    
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                          Leitura de Metadados
                        </h4>
                        <p className="text-xs text-gray-500 pl-7">
                          O sistema lê os títulos das músicas e os nomes dos artistas que você inseriu por texto, adicionou um a um, ou que foram extraídos do link da sua playlist.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                          Mapeamento de Impressão Digital Musical
                        </h4>
                        <p className="text-xs text-gray-500 pl-7">
                          A IA utiliza o seu amplo modelo de conhecimento e banco de dados musical. Ela reconhece cada uma das canções famosas da sua lista e recupera suas características consagradas:
                        </p>
                        <ul className="list-disc pl-12 space-y-1 text-xs text-gray-500">
                          <li><strong>Tempo (BPM):</strong> Se a música é acelerada (energetizante) ou lenta (intimista).</li>
                          <li><strong>Escala e Tonalidade:</strong> Se possui tons brilhantes em escala maior ou acordes melancólicos de escala menor.</li>
                          <li><strong>Arranjo e Timbres:</strong> Presença de violão acústico, sintetizadores de ficção científica, guitarras distorcidas ou batidas eletrônicas.</li>
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                          Alquimia e Hibridização (Fusão)
                        </h4>
                        <p className="text-xs text-gray-500 pl-7">
                          Ao hibridizar, a IA calcula médias de andamento, analisa convergências harmônicas e estabelece pontes estilísticas. O resultado é um gênero híbrido unificado.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                          <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px] font-black">4</span>
                          Rimas e Métricas Poéticas Reais
                        </h4>
                        <p className="text-xs text-gray-500 pl-7">
                          Para a letra, a IA aplica as regras poéticas nativas do idioma selecionado:
                        </p>
                        <ul className="list-disc pl-12 space-y-1 text-xs text-gray-500">
                          <li><strong>Português:</strong> Versos em Redondilha Maior (7 sílabas poéticas) e rimas ricas.</li>
                          <li><strong>Inglês:</strong> Pentâmetros iâmbicos clássicos e rimas imperfeitas (slant rhymes) do Pop internacional.</li>
                          <li><strong>Espanhol:</strong> Rimas asonantes e consonantes com cadência típica latina.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-xs font-semibold text-orange-800">
                      💡 <strong>Como usar no Suno AI:</strong> Acesse o <a href="https://suno.com/create" target="_blank" rel="noreferrer" className="underline font-bold text-orange-900 hover:text-orange-950">suno.com/create</a>, ative o <strong>Custom Mode</strong>, cole o prompt gerado no campo <strong>Style of Music</strong> e a letra com as metatags estruturais (ex: [Verse], [Chorus]) no campo <strong>Lyrics</strong>.
                    </div>
                  </div>
                )}

                {activePanel === 'settings' && (
                  <div className="space-y-6 pb-8 text-sm">
                    <div className="space-y-2">
                      <p className="text-gray-600 leading-relaxed text-xs">
                        Por padrão, o aplicativo utiliza uma chave de API Gemini do criador para analisar as playlists. Se houver muitos acessos simultâneos, essa chave pode atingir limites de cota.
                      </p>
                      <p className="text-gray-600 leading-relaxed text-xs">
                        Para garantir uso ilimitado e imediato, você pode conectar sua própria chave de API gratuita. Ela ficará <strong>armazenada com total segurança apenas no seu navegador (localStorage)</strong>.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Key size={14} className="text-orange-500" />
                          Sua Chave de API Gemini
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="AIzaSy..."
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (customApiKey.trim()) {
                              localStorage.setItem('user_gemini_api_key', customApiKey.trim());
                              setHasCustomKey(true);
                              alert('Chave de API salva com sucesso! Ela será usada para as próximas análises.');
                            } else {
                              alert('Por favor, digite uma chave válida.');
                            }
                          }}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm text-center"
                        >
                          Salvar Chave
                        </button>
                        {hasCustomKey && (
                          <button
                            onClick={() => {
                              localStorage.removeItem('user_gemini_api_key');
                              setCustomApiKey("");
                              setHasCustomKey(false);
                              alert('Sua chave personalizada foi removida. O app voltou a usar a chave padrão.');
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
                      <h4 className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        Como obter uma chave gratuita?
                      </h4>
                      <ol className="list-decimal pl-4 space-y-1 text-xs text-orange-700">
                        <li>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-0.5 hover:text-orange-900">Google AI Studio <ExternalLink size={10} /></a>.</li>
                        <li>Faça login com sua conta Google.</li>
                        <li>Clique no botão azul <strong>"Create API Key"</strong>.</li>
                        <li>Selecione um projeto ou crie um novo para gerar sua chave.</li>
                        <li>Copie a chave gerada e cole no campo acima!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 text-center"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-100 text-xs text-orange-600 font-bold mb-2">
                  <Sparkles size={14} />
                  Sintetizador Oficial de Prompts para SUNO AI
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                  Desbloqueie o DNA Musical de <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Qualquer Playlist</span>
                </h2>
                <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto font-medium">
                  Extraímos o BPM, tonalidade, estrutura harmônica e narrativa das faixas da sua playlist do YouTube para gerar o prompt perfeito e super detalhado para você colar no SUNO AI.
                </p>
              </div>

              <PlaylistInput onTracksFound={handleTracksFound} />

              <div className="max-w-2xl mx-auto p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-orange-500 flex items-center justify-center gap-1.5">
                    <Settings size={14} /> Opções de Alquimia Sonora
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Configure o idioma, vocais e os arranjos instrumentais do seu prompt para o SUNO.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-semibold w-full sm:w-auto justify-between sm:justify-start">
                    <span className="text-gray-500">Idioma da Letra:</span>
                    <select
                      value={lyricsLanguage}
                      onChange={(e) => setLyricsLanguage(e.target.value)}
                      className="bg-transparent border-none text-gray-700 focus:outline-none focus:ring-0 font-bold cursor-pointer outline-none"
                      id="initial-lang-select"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="font-semibold text-gray-700 bg-white">
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-semibold w-full sm:w-auto justify-between sm:justify-start cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="text-gray-500">Com vocal:</span>
                    <input 
                      type="checkbox" 
                      checked={withVocals}
                      onChange={() => setWithVocals(!withVocals)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 focus:outline-none cursor-pointer"
                    />
                  </label>
                </div>

                {/* Instrument selectors */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 text-left">🎹 Arranjo e Instrumentação do DNA Híbrido</p>
                  <InstrumentSelector
                    selectedSolo={selectedSoloInstruments}
                    selectedBase={selectedBaseInstruments}
                    onChange={(solo, base) => {
                      setSelectedSoloInstruments(solo);
                      setSelectedBaseInstruments(base);
                    }}
                  />
                </div>

                <p className="text-[10px] text-gray-400 italic">
                  O algoritmo otimizará a letra usando a métrica poética, ritmo e rimas tradicionais do idioma selecionado (ex: <span className="text-orange-500 font-bold">{LANGUAGES.find(l => l.code === lyricsLanguage)?.desc}</span>).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                  { icon: <Zap className="text-orange-500" />, title: "1. Extração de DNA", desc: "Análise inteligente de ritmo, energia, tom e acordes a partir de cada faixa da sua playlist." },
                  { icon: <Layers className="text-orange-500" />, title: "2. Hibridização Genética", desc: "Fusão de múltiplas composições, fundindo gêneros e sugerindo estruturas ideais para novas músicas." },
                  { icon: <Music className="text-orange-500" />, title: "3. Pronto para o SUNO AI", desc: "Criação de prompts de estilo refinados com menos de 300 caracteres e letras/estruturas personalizadas." }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 text-left space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                      {item.icon}
                    </div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {(step === "analyzing" || step === "hybridizing" || step === "updating") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 max-w-xl mx-auto w-full space-y-8 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm"
            >
              {error ? (
                // Beautiful Error State
                <div className="text-center space-y-6 w-full">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <AlertCircle size={36} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-gray-900">Ops! Falha na Síntese Alquímica</h3>
                    <p className="text-gray-500 text-xs leading-relaxed max-w-md mx-auto">
                      Ocorreu um erro ao processar o DNA musical da sua playlist. A API do Gemini pode estar temporariamente congestionada ou com problemas de rede.
                    </p>
                  </div>

                  <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100/50 text-left space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-600 block">Detalhes do Erro:</span>
                    <p className="text-xs font-mono text-red-800 break-words leading-relaxed">{error}</p>
                  </div>

                  {(error.toLowerCase().includes("chave") || error.toLowerCase().includes("key") || error.toLowerCase().includes("cota") || error.toLowerCase().includes("quota") || error.toLowerCase().includes("api")) && (
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-xs text-orange-800 text-left flex gap-3 items-start">
                      <Key size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Dica de Alquimia:</p>
                        <p className="mt-0.5 leading-relaxed text-orange-700">
                          Configure sua própria chave de API gratuita do Google AI Studio no painel de configurações (ícone de engrenagem no topo direito) para ter maior limite de cota.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleCancelAnalysis}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer text-center"
                    >
                      Cancelar e Voltar
                    </button>
                    <button
                      onClick={() => handleTracksFound(tracks)}
                      className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-2 shadow-md shadow-orange-100"
                    >
                      <RefreshCw size={14} className="animate-spin" />
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              ) : (
                // Loading / Processing State
                <>
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-orange-100 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="text-orange-500 animate-spin" size={36} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2 w-full">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {step === "analyzing" ? "Decodificando DNA da Playlist..." : 
                       step === "hybridizing" ? "Sintetizando DNA Híbrido..." : 
                       "Atualizando Instruções..."}
                    </h3>
                    <p className="text-gray-400 font-mono text-xs animate-pulse max-w-md mx-auto">
                      {status}
                    </p>
                  </div>

                  {/* Playlist Feed/Queue Progress */}
                  {tracks.length > 0 && (
                    <div className="w-full space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        <span>Fila de Decodificação Musical</span>
                        <span className="text-orange-500">{tracks.length} Músicas</span>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {tracks.map((track, index) => (
                          <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 font-mono text-[10px] font-bold">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 truncate">{track.title}</p>
                                <p className="text-[10px] text-gray-400 truncate">{track.artist}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {step === "analyzing" ? (
                                <span className="flex items-center gap-1 text-[10px] text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded-md animate-pulse">
                                  <RefreshCw size={10} className="animate-spin" />
                                  Lendo...
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 size={10} />
                                  DNA Pronto!
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancel Button */}
                  <button
                    onClick={handleCancelAnalysis}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    Cancelar Análise
                  </button>
                </>
              )}
            </motion.div>
          )}

          {step === "result" && hybridDNA && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 w-full"
            >
              {/* Top Title Card */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wider text-orange-500">DNA Sintetizado com Sucesso</span>
                  <h2 className="text-3xl font-black tracking-tight">{hybridDNA.title}</h2>
                  <p className="text-sm text-gray-400 font-medium">Criado com base em {tracks.length} faixas analisadas</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    onClick={reset}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Sintetizar Nova Playlist
                  </button>
                  <a
                    href="https://suno.com/create"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    Abrir SUNO AI
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left & Middle: DNA Info & Suno Copy Panels */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* DNA Specs Card */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">Estatísticas do DNA</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tempo Base</label>
                        <p className="text-xl font-mono font-bold text-gray-900">{hybridDNA.baseBpm} <span className="text-xs text-gray-400">BPM</span></p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tom Dominante</label>
                        <p className="text-xl font-mono font-bold text-gray-900">{hybridDNA.dominantKey}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Vibe/Clima</label>
                        <p className="text-sm font-bold text-gray-900 capitalize">{hybridDNA.overallMood}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Energia Média</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${hybridDNA.averageEnergy * 10}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{hybridDNA.averageEnergy}/10</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Progressão de Acordes sugerida</label>
                        <p className="text-sm font-mono bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-700">{hybridDNA.combinedProgression}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Instrumentação Recomendada</label>
                        <div className="flex flex-wrap gap-1.5">
                          {hybridDNA.instruments.map((inst, i) => (
                            <span key={i} className="px-2.5 py-1 bg-gray-50 rounded-lg text-xs font-semibold text-gray-600 border border-gray-100">{inst}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {hybridDNA.thematicNarrative && (
                      <div className="space-y-2 pt-4 border-t border-gray-50">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Narrativa Lírica (Conceito)</label>
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                          {hybridDNA.thematicNarrative}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SUNO AI Integration Prompts */}
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-gray-900 flex items-center gap-2">
                          <Sparkles className="text-orange-500" size={18} />
                          Prompts Otimizados para SUNO
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Copie os campos abaixo e cole diretamente na interface do SUNO em modo Custom.</p>
                      </div>
                      
                      {/* Configuration Controls */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap gap-2 items-center justify-end">
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-semibold">
                            <span className="text-gray-500">Idioma da Letra</span>
                            <select
                              value={lyricsLanguage}
                              onChange={(e) => handleLanguageChange(e.target.value)}
                              className="bg-transparent border-none text-gray-700 focus:outline-none focus:ring-0 font-bold cursor-pointer"
                              id="results-lang-select"
                            >
                              {LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code} className="font-semibold text-gray-700 bg-white">
                                  {lang.flag} {lang.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-semibold cursor-pointer hover:bg-gray-100 transition-colors">
                            <span className="text-gray-500">Com vocal:</span>
                            <input 
                              type="checkbox" 
                              checked={withVocals}
                              onChange={toggleVocals}
                              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 focus:outline-none cursor-pointer"
                            />
                          </label>

                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-semibold">
                            <span className="text-gray-500">Modo Mashup</span>
                            <button 
                              onClick={handleMashupToggle}
                              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${!mashupMode ? 'bg-gray-200' : 'bg-orange-500'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${!mashupMode ? 'left-0.5' : 'left-5.5'}`}></div>
                            </button>
                            <span className="text-gray-700">{mashupMode ? "Sim" : "Não"}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          Métrica poética adaptada: <span className="text-orange-500 font-bold">{LANGUAGES.find(l => l.code === lyricsLanguage)?.desc}</span>
                        </div>
                      </div>
                    </div>

                    {/* Adjustable Instrumentation options */}
                    <div className="space-y-3 bg-gray-50/30 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">🎹 Ajustar Instrumentação do DNA Híbrido</p>
                      <InstrumentSelector
                        selectedSolo={selectedSoloInstruments}
                        selectedBase={selectedBaseInstruments}
                        onChange={handleInstrumentsChange}
                      />
                    </div>

                    <div className="space-y-6">
                      
                      {/* 1. Style of Music Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black">1</span>
                            Style of Music (Estilo da Música)
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 font-mono">{hybridDNA.sunoStylePrompt.length} / 300 caracteres</span>
                        </div>
                        <p className="text-xs text-gray-400 italic">O limite de estilo foi ampliado para até 300 caracteres, permitindo maior riqueza na descrição de instrumentos, subgêneros e timbres de estúdio.</p>
                        <div className="relative bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-start justify-between gap-4 group">
                          <p className="text-xs font-mono text-gray-100 leading-relaxed flex-1 break-words">
                            {hybridDNA.sunoStylePrompt}
                          </p>
                          <button 
                            onClick={() => handleCopyPrompt(hybridDNA.sunoStylePrompt, 'style')}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer flex-shrink-0"
                            title="Copiar prompt de estilo"
                          >
                            {copiedStyle ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                          </button>
                        </div>
                        {copiedStyle && <p className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> Copiado para o campo 'Style of Music'!</p>}
                      </div>

                      {/* 2. Custom Lyrics Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black">2</span>
                            Lyrics & Arrangement (Letras e Estrutura)
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 italic">Estruturado com metatags como [Verse] e [Chorus] para máxima fidelidade estrutural.</p>
                        <div className="relative bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                          <div className="max-h-64 overflow-y-auto p-4 md:p-6 font-mono text-xs text-gray-300 space-y-4 whitespace-pre-wrap leading-relaxed">
                            {hybridDNA.sunoLyrics}
                          </div>
                          <div className="absolute right-3 top-3 z-10">
                            <button 
                              onClick={() => handleCopyPrompt(hybridDNA.sunoLyrics, 'lyrics')}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all cursor-pointer"
                              title="Copiar todas as letras"
                            >
                              {copiedLyrics ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                        {copiedLyrics && <p className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> Letras e metatags copiadas!</p>}
                      </div>

                    </div>
                  </div>

                  {/* Step-by-Step Guide for Suno App */}
                  <div className="bg-orange-50/50 rounded-3xl border border-orange-100/50 p-6 md:p-8 space-y-4">
                    <h4 className="font-bold text-sm text-orange-800 flex items-center gap-2">
                      <HelpCircle size={16} />
                      Como usar no SUNO AI?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-orange-950">
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-orange-100/30">
                        <p className="font-bold">1. Ative o Modo Personalizado</p>
                        <p>Acesse o site do SUNO (<a href="https://suno.com/create" target="_blank" rel="noreferrer" className="underline font-bold text-orange-600 hover:text-orange-800">suno.com/create</a>) e ative a opção <strong className="text-orange-600">"Custom"</strong> no painel esquerdo para liberar os campos.</p>
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-orange-100/30">
                        <p className="font-bold">2. Cole o Estilo de Música</p>
                        <p>Copie o prompt <strong className="text-orange-600">Style of Music</strong> acima e cole no campo respectivo (limite de 120 caracteres).</p>
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-orange-100/30">
                        <p className="font-bold">3. Cole as Letras ou Metatags</p>
                        <p>Copie o bloco de <strong className="text-orange-600">Lyrics & Arrangement</strong> completo e cole no campo "Lyrics" do SUNO.</p>
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-orange-100/30">
                        <p className="font-bold">4. Dê o Play e Gere!</p>
                        <p>Dê um título ao seu projeto se desejar, e clique em <strong className="text-orange-600">"Create"</strong>. O SUNO gerará duas variações baseadas no seu DNA!</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Panel: Analyzed Source Tracks */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-1">
                    <Library size={12} />
                    Origens do DNA ({tracks.length})
                  </h3>
                  <div className="space-y-3">
                    {trackDNAs.map((track, i) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs border border-gray-100">
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate text-gray-800">{track.title}</p>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px] font-mono font-bold">
                          <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">{track.bpm} BPM</span>
                          <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">Tom: {track.key}</span>
                        </div>
                        {track.thematicIdea && (
                          <div className="pt-2">
                            <p className="text-[10px] text-gray-500 leading-normal bg-gray-50/50 p-2 rounded-lg border border-gray-50/50 italic">
                              <span className="font-bold text-gray-400 uppercase mr-1">Conceito:</span>
                              {track.thematicIdea}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-orange-100/50 space-y-6 relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50 -z-10" />
                
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                    <Sparkles size={28} className="animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-2xl tracking-tight text-gray-900 leading-tight">
                    Crie Músicas Incríveis com o Seu <span className="text-orange-500">DNA Musical</span>!
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Bem-vindo ao laboratório alquímico de fusão sonora. Veja o que você pode alcançar hoje:
                  </p>
                </div>

                <div className="space-y-4 py-1">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 flex-shrink-0 mt-0.5">
                      <Dna size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Fusão Alquímica de Playlists</h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Mescle ritmos, tons e energia de músicas reais para sintetizar uma assinatura sonora única e exclusiva.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 flex-shrink-0 mt-0.5">
                      <Music size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Engenharia Reversa para Suno AI</h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Obtenha prompts de estilo otimizados com metatags de arranjo prontas para copiar e usar no Suno AI.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 flex-shrink-0 mt-0.5">
                      <Award size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Letras & Poesia de Alta Fidelidade</h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        Escreva composições emocionais estruturadas com pontes ([Bridge]), refrões ([Chorus]) e versos ricos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group text-xs text-gray-500 hover:text-gray-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Não mostrar esta mensagem novamente</span>
                  </label>

                  <button
                    onClick={() => {
                      if (dontShowAgain) {
                        localStorage.setItem('hide_welcome_modal_suno', 'true');
                      }
                      setShowWelcome(false);
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-orange-200 cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    Vamos Começar!
                    <Sparkles size={16} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle size={24} className="flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold text-xs bg-white border border-red-200 px-2 py-1 rounded-lg cursor-pointer">
              Fechar
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 mt-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Dna size={16} />
            <span className="text-xs font-semibold">© 2026 SUNO Music DNA Hybridizer. Alimentado por Gemini 3.5.</span>
          </div>
          <div className="flex gap-6 text-xs font-bold text-gray-400">
            <a href="https://suno.com/create" target="_blank" rel="noreferrer" className="hover:text-orange-500">SUNO AI</a>
            <a href="#" className="hover:text-orange-500" onClick={(e) => { e.preventDefault(); reset(); }}>Nova Análise</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
