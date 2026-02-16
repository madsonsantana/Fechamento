
export enum FilterType {
  Todos = 'Todos',
  Anteriores = 'Anteriores',
  Aberto = 'Aberto',
  Liberado = 'Liberado',
  FinancLiberado = 'Financeiro Liberado',
  NaoSairam = 'NaoSairam',
  EmRota = 'EmRota',
  AtrasoFisico = 'AtrasoFisico',
  Reabertos = 'Reabertos',
  NaoFinanceiro = 'NaoFinanceiro',
  Futuros = 'Futuros'
}

export interface MapData {
  Mapa: string;
  Situacao: string;
  ValorTotal: string;
  DataEmissao: string;
  Motorista?: string;
  Placa?: string;
  Log: LogisticsTimes;
  Financial: FinancialSummary;
  Invoices: InvoiceData[];
  IsReabertoAuto: boolean;
  IsRecolha: boolean;
}

export interface LogisticsTimes {
  hCar: string;
  hSai: string;
  hChe: string;
  hFis: string;
  hFin: string;
  tFis: string;
  tFin: string;
  tInt: string;
}

export interface FinancialSummary {
  pago: number;
  prazo: number;
  pendente: number;
}

export interface InvoiceData {
  Nota: string;
  Cliente: string;
  RazaoSocial: string;
  Condicao: string;
  Total: string;
  StatusHTML: string;
  Tipo: 'PAGO' | 'PRAZO' | 'PENDENTE' | 'DEVOLVIDA' | 'OUTRO';
}

export interface AppState {
  maps: MapData[];
  lastUpdate: Date | null;
  counts: Record<string, number>;
  futureLabel: string;
}
