
export const norm = (val: any): string => {
  if (!val) return "";
  return val.toString().replace(/\D/g, '').replace(/^0+/, '').trim();
};

export const toUpper = (val: any): string => {
  if (!val) return "---";
  return val.toString().toUpperCase().trim();
};

export const parseMoeda = (val: any): number => {
  if (!val) return 0;
  const clean = val.toString().replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(clean) || 0;
};

export const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
};

export const getHojeFormatado = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const isTimeEmpty = (val: string): boolean => {
  const v = (val || "").toString().trim();
  return v === "" || v === "00:00" || v === "--:--" || v === "00:00:00" || v === "0";
};

export const decodeISO = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder('iso-8859-1');
  return decoder.decode(buffer);
};
