
import Papa from 'papaparse';
import { norm, toUpper, parseMoeda, parseDate, getHojeFormatado, isTimeEmpty } from '../utils';
import { MapData, AppState, FilterType, InvoiceData, FinancialSummary } from '../types';

export async function processFiles(filesData: Record<string, string>): Promise<AppState> {
  const parseOptions = { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim() };
  
  // Extract specific data sets
  const statusData = filesData['03.03.12'] ? Papa.parse(filesData['03.03.12'], parseOptions).data as any[] : [];
  const statusRaw = filesData['03.03.12'] ? Papa.parse(filesData['03.03.12'], { header: false }).data as any[][] : [];
  const logRaw = filesData['03.11.40'] ? Papa.parse(filesData['03.11.40'], { header: false }).data as any[][] : [];
  const escalaData = filesData['03.11.29'] ? Papa.parse(filesData['03.11.29'], parseOptions).data as any[] : [];
  const fatData = filesData['03.02.37'] ? Papa.parse(filesData['03.02.37'], parseOptions).data as any[] : [];
  const coraData = filesData['cora'] ? Papa.parse(filesData['cora'], parseOptions).data as any[] : [];
  const mestreData = filesData['01.20.01.27'] ? Papa.parse(filesData['01.20.01.27'], parseOptions).data as any[] : [];

  const hoje = getHojeFormatado();
  const hojeDate = parseDate(hoje);
  
  const maps: MapData[] = [];
  const counts: Record<string, number> = {
    [FilterType.Todos]: 0,
    [FilterType.Anteriores]: 0,
    [FilterType.Aberto]: 0,
    [FilterType.Liberado]: 0,
    [FilterType.FinancLiberado]: 0,
    [FilterType.NaoSairam]: 0,
    [FilterType.EmRota]: 0,
    [FilterType.AtrasoFisico]: 0,
    [FilterType.Reabertos]: 0,
    [FilterType.NaoFinanceiro]: 0,
    [FilterType.Futuros]: 0,
  };

  let minFuture: string | null = null;

  statusData.forEach((m) => {
    const idM = norm(m.Mapa);
    if (!idM) return;

    const rowS = statusRaw.find(r => norm(r[0]) === idM);
    const dataEmissao = rowS && rowS[3] ? rowS[3].toString().trim() : "---";
    const dataMDate = parseDate(dataEmissao);
    const ehHoje = dataEmissao === hoje;
    const ehFuturo = dataMDate > hojeDate;
    
    const situacao = (m.Situacao || m.Situação || "").toString().trim();
    const situacaoLower = situacao.toLowerCase();

    // Logistics
    const rowLog = logRaw.find(r => norm(r[0]) === idM);
    const logTimes = {
      hCar: rowLog ? rowLog[6] || '--:--' : '--:--',
      hSai: rowLog ? rowLog[7] || '--:--' : '--:--',
      hChe: rowLog ? rowLog[8] || '--:--' : '--:--',
      hFis: rowLog ? rowLog[9] || '--:--' : '--:--',
      hFin: rowLog ? rowLog[10] || '--:--' : '--:--',
      tFis: rowLog ? rowLog[12] || '--:--' : '--:--',
      tFin: rowLog ? rowLog[13] || '--:--' : '--:--',
      tInt: rowLog ? rowLog[14] || '--:--' : '--:--',
    };

    // Driver/Scale
    const scale = escalaData.find(x => norm(x.Mapa) === idM) || {};
    
    // Invoices
    const nfs = fatData.filter(x => norm(x.Mapa) === idM);
    let somaP = 0, somaZ = 0, somaD = 0;
    
    const processedNFs: InvoiceData[] = nfs.map(n => {
      const condCode = norm(n['Cond. pagt'] || n['Cond. pag']);
      const mestreRow = mestreData.find(r => norm(r['Condição'] || Object.values(r)[1]) === condCode);
      const condDesc = toUpper(mestreRow ? mestreRow['Descrição'] || Object.values(mestreRow)[2] : n['Cond. pagt'] || n['Cond. pag']);
      
      const v = parseMoeda(n.Total);
      let info: { texto: string, tipo: InvoiceData['Tipo'] };

      if ((n['Mot. Cancelamento'] || "").toString().trim() !== "") {
        info = { texto: 'NF DEVOLVIDA', tipo: 'DEVOLVIDA' };
      } else if (condDesc.includes('CREDITO EM CONTA') || coraData.some(c => norm(c['Nota fiscal']) === norm(n.Nota) && toUpper(c.Status).includes('PAGO'))) {
        info = { texto: 'PAGO', tipo: 'PAGO' };
        somaP += v;
      } else if (condDesc.includes('BOLETO')) {
        info = { texto: 'VENDA A PRAZO', tipo: 'PRAZO' };
        somaZ += v;
      } else if (['PIX', 'DINHEIRO', 'CREDITO', 'À VISTA', 'A VISTA', 'CONTA'].some(t => condDesc.includes(t))) {
        info = { texto: 'PENDENTE', tipo: 'PENDENTE' };
        somaD += v;
      } else {
        info = { texto: 'NÃO FINANCEIRO', tipo: 'OUTRO' };
      }

      return {
        Nota: n.Nota,
        Cliente: toUpper(n.Cliente),
        RazaoSocial: toUpper(n.Nome || n['Razão Social']),
        Condicao: condDesc,
        Total: n.Total,
        StatusHTML: info.texto,
        Tipo: info.tipo
      };
    });

    const isReaberto = [7, 8, 9, 10, 11, 13, 14].every(idx => rowLog && !isTimeEmpty(rowLog[idx])) && situacaoLower === 'aberto';
    const isRecolha = toUpper(scale['Nome Motorista']) === "" && toUpper(scale['Placa']) === "" && parseMoeda(m['Valor Total']) === 0;
    const isNaoFinanceiro = processedNFs.length === 0 || processedNFs.every(n => n.Tipo === 'OUTRO');

    const mapObj: MapData = {
      Mapa: m.Mapa.replace(/\./g, ''),
      Situacao: situacao,
      ValorTotal: m['Valor Total'] || '0,00',
      DataEmissao: dataEmissao,
      Motorista: toUpper(scale['Nome Motorista']),
      Placa: toUpper(scale['Placa']),
      Log: logTimes,
      Invoices: processedNFs,
      IsReabertoAuto: isReaberto,
      IsRecolha: isRecolha,
      Financial: { pago: somaP, prazo: somaZ, pendente: somaD }
    };

    maps.push(mapObj);

    // Update Counts
    if (!ehFuturo) counts[FilterType.Todos]++;
    if (!ehHoje && !ehFuturo) counts[FilterType.Anteriores]++;
    if (ehFuturo) {
      counts[FilterType.Futuros]++;
      if (!minFuture || parseDate(dataEmissao) < parseDate(minFuture)) minFuture = dataEmissao;
    }
    if (situacaoLower === 'aberto' && !ehFuturo) counts[FilterType.Aberto]++;
    if ((situacaoLower === 'liberado' || situacaoLower === 'concluido') && !ehFuturo) counts[FilterType.Liberado]++;
    if (situacaoLower === 'financeiro liberado' && !ehFuturo) counts[FilterType.FinancLiberado]++;
    if (isTimeEmpty(logTimes.hSai) && !ehFuturo) counts[FilterType.NaoSairam]++;
    if (!isTimeEmpty(logTimes.hSai) && isTimeEmpty(logTimes.hChe) && isTimeEmpty(logTimes.hFis) && isTimeEmpty(logTimes.hFin) && !ehFuturo) counts[FilterType.EmRota]++;
    if (!isTimeEmpty(logTimes.hChe) && isTimeEmpty(logTimes.hFis) && situacaoLower === 'aberto' && !ehFuturo) counts[FilterType.AtrasoFisico]++;
    if (isReaberto && !ehFuturo) counts[FilterType.Reabertos]++;
    if (isNaoFinanceiro && !ehFuturo) counts[FilterType.NaoFinanceiro]++;
  });

  return {
    maps,
    lastUpdate: new Date(),
    counts,
    futureLabel: minFuture ? `FAT ${minFuture}` : 'FAT FUTUROS'
  };
}
