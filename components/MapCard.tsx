
import React, { useState } from 'react';
import { MapData } from '../types';
import Badge from './Badge';

interface MapCardProps {
  map: MapData;
}

const MapCard: React.FC<MapCardProps> = ({ map }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 ${map.IsReabertoAuto ? 'reaberto-animation' : ''} ${isOpen ? 'shadow-lg scale-[1.01] z-10' : 'hover:border-slate-300'}`}>
      <div 
        className="p-4 cursor-pointer grid grid-cols-1 md:grid-cols-[200px_1fr_200px_40px] gap-4 items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col gap-1">
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">MAPA {map.Mapa}</span>
          <span className="text-xs text-slate-500 font-medium">EMISSÃO: {map.DataEmissao}</span>
          <div className="flex flex-wrap gap-1 mt-1">
             <Badge label={map.Situacao} />
             {map.IsReabertoAuto && <Badge label="REABERTO AUTO" variant="danger" />}
             {map.IsRecolha && <Badge label="RECOLHA" variant="neutral" />}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
          <LogItem label="Carreg." value={map.Log.hCar} />
          <LogItem label="Saída" value={map.Log.hSai} />
          <LogItem label="Chegada" value={map.Log.hChe} />
          <LogItem label="H. Físico" value={map.Log.hFis} />
          <LogItem label="H. Finan." value={map.Log.hFin} />
          <LogItem label="T. Físico" value={map.Log.tFis} />
          <LogItem label="T. Finan." value={map.Log.tFin} />
          <LogItem label="T. Interno" value={map.Log.tInt} />
        </div>

        <div className="text-right flex flex-col items-end">
           <span className="text-xs text-slate-500 uppercase font-bold">Valor Total</span>
           <span className="text-lg font-bold text-slate-900 dark:text-white">R$ {map.ValorTotal}</span>
           <div className="flex gap-2 mt-1">
              <span className="text-[10px] text-emerald-600 font-bold">P: {map.Financial.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-amber-600 font-bold">A: {map.Financial.prazo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-red-600 font-bold">D: {map.Financial.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           </div>
        </div>

        <div className="flex justify-center text-slate-400">
           <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10 overflow-x-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
             <div className="bg-white dark:bg-slate-800 p-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Motorista</span>
                <span className="font-bold dark:text-white">{map.Motorista}</span>
             </div>
             <div className="bg-white dark:bg-slate-800 p-2 px-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Placa</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{map.Placa}</span>
             </div>
          </div>

          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-3">NF</th>
                <th className="py-2 px-3">Cliente (PDV)</th>
                <th className="py-2 px-3">Razão Social</th>
                <th className="py-2 px-3">Condição</th>
                <th className="py-2 px-3 text-right">Valor</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {map.Invoices.map((inv, idx) => (
                <tr key={idx} className="text-xs hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <td className="py-3 px-3 font-bold dark:text-white">{inv.Nota}</td>
                  <td className="py-3 px-3 dark:text-slate-300">{inv.Cliente}</td>
                  <td className="py-3 px-3 dark:text-slate-300">{inv.RazaoSocial}</td>
                  <td className="py-3 px-3 dark:text-slate-400 italic">{inv.Condicao}</td>
                  <td className="py-3 px-3 text-right font-medium dark:text-white">R$ {inv.Total}</td>
                  <td className="py-3 px-3"><Badge label={inv.StatusHTML} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {map.Invoices.length === 0 && (
            <div className="py-8 text-center text-slate-400 italic">Sem faturas associadas.</div>
          )}
        </div>
      )}
    </div>
  );
};

const LogItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex flex-col min-w-[60px]">
    <span className="text-[8px] text-slate-500 uppercase font-extrabold leading-tight">{label}</span>
    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{value}</span>
  </div>
);

export default MapCard;
