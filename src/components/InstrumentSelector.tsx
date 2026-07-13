import React, { useState } from "react";
import { ChevronDown, Plus, Sparkles, X } from "lucide-react";

interface InstrumentSelectorProps {
  selectedSolo: string[];
  selectedBase: string[];
  onChange: (selectedSolo: string[], selectedBase: string[]) => void;
  titleClassName?: string;
}

const AUTO_VALUE = "__auto__";

const PRESETS_SOLO = [
  "Guitarra Elétrica",
  "Violão Acústico",
  "Teclado/Sintetizador",
  "Saxofone",
  "Piano de Cauda",
  "Flauta de Pã",
  "Flauta Transversal",
  "Violino",
  "Trompete",
  "Gaita",
  "Sanfona"
];

const PRESETS_BASE = [
  "Bateria Atômica",
  "Baixo Groove",
  "Violão de Acompanhamento",
  "Sintetizador Analógico",
  "Piano de Cauda",
  "Órgão Hammond",
  "Batida Trip-Hop",
  "Batida Lo-fi",
  "Percussão Étnica",
  "Guitarras Distorcidas"
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  selectedSolo,
  selectedBase,
  onChange,
  titleClassName = "text-xs font-black uppercase tracking-wider text-gray-400"
}) => {
  const [customSolo, setCustomSolo] = useState("");
  const [customBase, setCustomBase] = useState("");

  const handleToggleSolo = (instrument: string) => {
    const next = selectedSolo.includes(instrument)
      ? selectedSolo.filter((x) => x !== instrument)
      : [...selectedSolo, instrument];

    onChange(next, selectedBase);
  };

  const handleToggleBase = (instrument: string) => {
    const next = selectedBase.includes(instrument)
      ? selectedBase.filter((x) => x !== instrument)
      : [...selectedBase, instrument];

    onChange(selectedSolo, next);
  };

  const handleClearSolo = () => {
    onChange([], selectedBase);
  };

  const handleClearBase = () => {
    onChange(selectedSolo, []);
  };

  const handleSelectSolo = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) return;
    if (value === AUTO_VALUE) {
      handleClearSolo();
      return;
    }
    if (!selectedSolo.includes(value)) {
      onChange([...selectedSolo, value], selectedBase);
    }
  };

  const handleSelectBase = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (!value) return;
    if (value === AUTO_VALUE) {
      handleClearBase();
      return;
    }
    if (!selectedBase.includes(value)) {
      onChange(selectedSolo, [...selectedBase, value]);
    }
  };

  const handleAddCustomSolo = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customSolo.trim();
    if (!val) return;
    if (!selectedSolo.includes(val)) {
      onChange([...selectedSolo, val], selectedBase);
    }
    setCustomSolo("");
  };

  const handleAddCustomBase = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customBase.trim();
    if (!val) return;
    if (!selectedBase.includes(val)) {
      onChange(selectedSolo, [...selectedBase, val]);
    }
    setCustomBase("");
  };

  const renderSelected = (
    selected: string[],
    onToggle: (instrument: string) => void
  ) => (
    <div className="flex min-h-8 flex-wrap items-center gap-1.5">
      {selected.length === 0 ? (
        <span className="inline-flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">
          <Sparkles size={10} /> Automático pelo SUNO
        </span>
      ) : (
        selected.map((inst) => (
          <span
            key={inst}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800 shadow-sm"
          >
            {inst}
            <button
              type="button"
              onClick={() => onToggle(inst)}
              className="ml-0.5 rounded text-orange-700 transition-colors hover:text-red-500 focus:outline-none cursor-pointer"
              title={`Remover ${inst}`}
            >
              <X size={12} />
            </button>
          </span>
        ))
      )}
    </div>
  );

  const renderPresetSelect = (
    label: string,
    selected: string[],
    presets: string[],
    onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void
  ) => (
    <div className="relative">
      <select
        value=""
        onChange={onSelect}
        className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 pr-9 text-xs font-bold text-gray-700 outline-none transition-colors cursor-pointer focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
        aria-label={label}
      >
        <option value="" disabled>
          Selecionar instrumento...
        </option>
        <option value={AUTO_VALUE}>Automático pelo SUNO</option>
        {presets.map((inst) => (
          <option key={inst} value={inst} disabled={selected.includes(inst)}>
            {selected.includes(inst) ? `${inst} (selecionado)` : inst}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );

  const isSoloAuto = selectedSolo.length === 0;
  const isBaseAuto = selectedBase.length === 0;

  return (
    <div className="space-y-5 text-left bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={titleClassName}>🎸 Instrumentos para Solo</label>
          {isSoloAuto ? (
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-100 flex items-center gap-1">
              <Sparkles size={10} /> Automático pelo SUNO
            </span>
          ) : (
            <button
              type="button"
              onClick={handleClearSolo}
              className="text-[10px] text-gray-400 hover:text-orange-500 font-bold transition-colors cursor-pointer"
            >
              Resetar para Automático
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
          {renderPresetSelect("Selecionar instrumento de solo", selectedSolo, PRESETS_SOLO, handleSelectSolo)}

          <form onSubmit={handleAddCustomSolo} className="flex gap-1">
            <input
              type="text"
              placeholder="Outro instrumento de solo..."
              value={customSolo}
              onChange={(e) => setCustomSolo(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition-colors cursor-pointer hover:bg-orange-600"
              title="Adicionar instrumento de solo"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        {renderSelected(selectedSolo, handleToggleSolo)}
      </div>

      <div className="space-y-3 border-t border-gray-100/80 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={titleClassName}>🥁 Instrumentos para Base (Acompanhamento)</label>
          {isBaseAuto ? (
            <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-100 flex items-center gap-1">
              <Sparkles size={10} /> Automático pelo SUNO
            </span>
          ) : (
            <button
              type="button"
              onClick={handleClearBase}
              className="text-[10px] text-gray-400 hover:text-orange-500 font-bold transition-colors cursor-pointer"
            >
              Resetar para Automático
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
          {renderPresetSelect("Selecionar instrumento de base", selectedBase, PRESETS_BASE, handleSelectBase)}

          <form onSubmit={handleAddCustomBase} className="flex gap-1">
            <input
              type="text"
              placeholder="Outro instrumento de base..."
              value={customBase}
              onChange={(e) => setCustomBase(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition-colors cursor-pointer hover:bg-orange-600"
              title="Adicionar instrumento de base"
            >
              <Plus size={14} />
            </button>
          </form>
        </div>

        {renderSelected(selectedBase, handleToggleBase)}
      </div>
    </div>
  );
};
