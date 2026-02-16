
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FilterType, AppState, MapData } from './types';
import { processFiles } from './services/csvProcessor';
import { decodeISO, parseDate, getHojeFormatado } from './utils';
import MapCard from './components/MapCard';

const App: React.FC = () => {
  const [handlePasta, setHandlePasta] = useState<FileSystemDirectoryHandle | null>(null);
  const [data, setData] = useState<AppState | null>(null);
  const [filter, setFilter] = useState<FilterType>(FilterType.Todos);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const readFolderContents = useCallback(async (files: File[] | FileList) => {
    setLoading(true);
    setError(null);
    try {
      const filesData: Record<string, string> = {};
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const buffer = await file.arrayBuffer();
          const text = decodeISO(buffer);
          const name = file.name.toLowerCase();
          
          if (name.includes('03.03.12')) filesData['03.03.12'] = text;
          if (name.includes('03.11.40')) filesData['03.11.40'] = text;
          if (name.includes('03.11.29')) filesData['03.11.29'] = text;
          if (name.includes('03.02.37')) filesData['03.02.37'] = text;
          if (name.includes('cora')) filesData['cora'] = text;
          if (name.includes('01.20.01.27')) filesData['01.20.01.27'] = text;
        }
      }

      if (Object.keys(filesData).length === 0) {
        throw new Error("Nenhum arquivo CSV válido encontrado na pasta selecionada.");
      }

      const newState = await processFiles(filesData);
      setData(newState);
    } catch (err: any) {
      setError(err.message || "Erro ao processar arquivos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const readFileSystemHandle = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setError(null);
    try {
      const filesData: Record<string, string> = {};
      
      const scan = async (h: FileSystemDirectoryHandle) => {
        // @ts-ignore
        for await (const entry of h.values()) {
          if (entry.kind === 'directory') {
            await scan(entry as unknown as FileSystemDirectoryHandle);
          } else if (entry.name.toLowerCase().endsWith('.csv')) {
            const file = await (entry as unknown as FileSystemFileHandle).getFile();
            const buffer = await file.arrayBuffer();
            const text = decodeISO(buffer);
            const name = entry.name.toLowerCase();
            
            if (name.includes('03.03.12')) filesData['03.03.12'] = text;
            if (name.includes('03.11.40')) filesData['03.11.40'] = text;
            if (name.includes('03.11.29')) filesData['03.11.29'] = text;
            if (name.includes('03.02.37')) filesData['03.02.37'] = text;
            if (name.includes('cora')) filesData['cora'] = text;
            if (name.includes('01.20.01.27')) filesData['01.20.01.27'] = text;
          }
        }
      };

      await scan(handle);
      const newState = await processFiles(filesData);
      setData(newState);
    } catch (err: any) {
      console.error("Erro no polling:", err);
    }
  }, []);

  const handleSelectFolder = async () => {
    // Tenta usar a API moderna primeiro
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
        setHandlePasta(handle);
        setLoading(true);
        await readFileSystemHandle(handle);
        setLoading(false);
      } catch (e) {
        console.log("Picker cancelado, tentando fallback...");
        fileInputRef.current?.click();
      }
    } else {
      // Fallback para navegadores antigos ou contextos não seguros
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      readFolderContents(e.target.files);
    }
  };

  useEffect(() => {
    if (!handlePasta) return;
    const interval = setInterval(() => {
      readFileSystemHandle(handlePasta);
    }, 5000);
    return () => clearInterval(interval);
  }, [handlePasta, readFileSystemHandle]);

  const filteredMaps = useMemo(() => {
    if (!data) return [];
    const hoje = getHojeFormatado();
    const hojeDate = parseDate(hoje);

    return data.maps.filter((m) => {
      const s = searchTerm.toUpperCase();
      const matchesSearch = searchTerm === '' || 
        m.Mapa.includes(s) || 
        (m.Motorista && m.Motorista.includes(s)) || 
        (m.Placa && m.Placa.includes(s)) ||
        m.Invoices.some(i => i.Nota.includes(s) || i.Cliente.includes(s) || i.RazaoSocial.includes(s));

      if (!matchesSearch) return false;

      const dataMDate = parseDate(m.DataEmissao);
      const ehHoje = m.DataEmissao === hoje;
      const ehFuturo = dataMDate > hojeDate;
      const situacaoLower = m.Situacao.toLowerCase();

      switch (filter) {
        case FilterType.Todos: return !ehFuturo;
        case FilterType.Anteriores: return !ehHoje && !ehFuturo;
        case FilterType.Futuros: return ehFuturo;
        case FilterType.Aberto: return situacaoLower === 'aberto' && !ehFuturo;
        case FilterType.Liberado: return (situacaoLower === 'liberado' || situacaoLower === 'concluido') && !ehFuturo;
        case FilterType.FinancLiberado: return situacaoLower === 'financeiro liberado' && !ehFuturo;
        case FilterType.Reabertos: return m.IsReabertoAuto && !ehFuturo;
        case FilterType.NaoSairam: return m.Log.hSai === '--:--' && !ehFuturo;
        case FilterType.EmRota: return m.Log.hSai !== '--:--' && m.Log.hChe === '--:--' && !ehFuturo;
        case FilterType.AtrasoFisico: return m.Log.hChe !== '--:--' && m.Log.hFis === '--:--' && situacaoLower === 'aberto' && !ehFuturo;
        case FilterType.NaoFinanceiro: return (m.Invoices.length === 0 || m.Invoices.every(i => i.Tipo === 'OUTRO')) && !ehFuturo;
        default: return true;
      }
    });
  }, [data, filter, searchTerm]);

  return (
    <div className="min-h-screen pb-20 flex flex-col">
      {/* Hidden Fallback Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        // @ts-ignore
        webkitdirectory="true" 
        directory="true" 
        onChange={handleFileInputChange} 
      />

      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm px-4">
        <div className="max-w-7xl mx-auto py-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
               </div>
               <div>
                  <h1 className="text-xl font-extrabold tracking-tight dark:text-white uppercase leading-none">Mapas Pro</h1>
                  {data?.lastUpdate && (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Live: {data.lastUpdate.toLocaleTimeString()}</span>
                  )}
               </div>
            </div>

            <div className="flex flex-1 max-w-xl w-full items-center gap-2">
               <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por mapa, motorista, cliente, placa ou NF..." 
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <button 
                 onClick={() => setDarkMode(!darkMode)}
                 className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
               >
                 {darkMode ? '☀️' : '🌙'}
               </button>
            </div>

            <button 
              onClick={handleSelectFolder}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <span>{handlePasta ? '🔄 Sincronizando' : '📂 Abrir Pasta'}</span>
            </button>
          </div>

          {data && (
            <div className="flex flex-wrap gap-1.5 justify-start md:justify-center overflow-x-auto pb-1 no-scrollbar">
               <FilterBtn label="Todos" count={data.counts[FilterType.Todos]} active={filter === FilterType.Todos} onClick={() => setFilter(FilterType.Todos)} color="blue" />
               <FilterBtn label="Ontem" count={data.counts[FilterType.Anteriores]} active={filter === FilterType.Anteriores} onClick={() => setFilter(FilterType.Anteriores)} color="slate" />
               <FilterBtn label="Abertos" count={data.counts[FilterType.Aberto]} active={filter === FilterType.Aberto} onClick={() => setFilter(FilterType.Aberto)} color="red" />
               <FilterBtn label="Lib." count={data.counts[FilterType.Liberado]} active={filter === FilterType.Liberado} onClick={() => setFilter(FilterType.Liberado)} color="emerald" />
               <FilterBtn label="Fin. Lib" count={data.counts[FilterType.FinancLiberado]} active={filter === FilterType.FinancLiberado} onClick={() => setFilter(FilterType.FinancLiberado)} color="amber" />
               <FilterBtn label="Em Rota" count={data.counts[FilterType.EmRota]} active={filter === FilterType.EmRota} onClick={() => setFilter(FilterType.EmRota)} color="sky" />
               <FilterBtn label="Reabertos" count={data.counts[FilterType.Reabertos]} active={filter === FilterType.Reabertos} onClick={() => setFilter(FilterType.Reabertos)} color="red" />
               <FilterBtn label={data.futureLabel} count={data.counts[FilterType.Futuros]} active={filter === FilterType.Futuros} onClick={() => setFilter(FilterType.Futuros)} color="indigo" />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-300">
             <span className="text-xl">⚠️</span>
             <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!data && !loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <span className="text-6xl">📊</span>
             </div>
             <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Pronto para começar?</h2>
             <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                Selecione a pasta do servidor ou exportação para monitorar os mapas logísticos em tempo real.
             </p>
             <button 
                onClick={handleSelectFolder}
                className="mt-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-10 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-lg"
             >
                Selecionar Pasta de Dados
             </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
             </div>
             <p className="mt-6 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-sm">Processando ERP...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center mb-2 px-1">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Exibindo {filteredMaps.length} de {data.maps.length} registros</span>
            </div>
            {filteredMaps.length > 0 ? (
              filteredMaps.map(m => (
                <MapCard key={m.Mapa} map={m} />
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 p-20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                <span className="text-5xl mb-6 block">🔎</span>
                <p className="text-xl font-bold text-slate-600 dark:text-slate-400">Nenhum mapa corresponde aos filtros.</p>
                <button onClick={() => {setFilter(FilterType.Todos); setSearchTerm('');}} className="mt-4 text-blue-600 font-bold hover:underline">Limpar Filtros</button>
              </div>
            )}
          </div>
        )}
      </main>

      <button 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl hover:scale-110 active:scale-90 transition-all z-50 group"
      >
        <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
      </button>
    </div>
  );
};

interface FilterBtnProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}

const FilterBtn: React.FC<FilterBtnProps> = ({ label, count, active, onClick, color }) => {
  const baseClasses = "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all duration-300 flex flex-col items-center min-w-[90px] shadow-sm";
  
  const colorMap: Record<string, string> = {
    blue: active ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/40' : 'bg-white dark:bg-slate-800 text-blue-600 border-blue-100 dark:border-blue-900/50 hover:bg-blue-50',
    slate: active ? 'bg-slate-700 text-white border-slate-700 shadow-slate-500/40' : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-50',
    red: active ? 'bg-red-600 text-white border-red-600 shadow-red-500/40' : 'bg-white dark:bg-slate-800 text-red-600 border-red-100 dark:border-red-900/50 hover:bg-red-50',
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/40' : 'bg-white dark:bg-slate-800 text-emerald-600 border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-50',
    amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/40' : 'bg-white dark:bg-slate-800 text-amber-600 border-amber-100 dark:border-amber-900/50 hover:bg-amber-50',
    sky: active ? 'bg-sky-500 text-white border-sky-500 shadow-sky-500/40' : 'bg-white dark:bg-slate-800 text-sky-600 border-sky-100 dark:border-sky-900/50 hover:bg-sky-50',
    indigo: active ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/40' : 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-50',
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${colorMap[color] || colorMap.slate} ${active ? 'scale-105' : 'opacity-80'}`}>
      <span className="mb-0.5">{label}</span>
      <span className="text-xs font-black">{count}</span>
    </button>
  );
};

export default App;
