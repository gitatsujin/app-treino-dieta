/** Formatação pt-BR usada nas telas. */

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_CURTOS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Converte 'AAAA-MM-DD' (ou data-hora ISO) em Date local, sem o deslocamento de fuso do construtor. */
export function paraData(iso: string): Date {
  if (iso.length > 10) return new Date(iso);
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** 1.234 · 72,5 */
export function num(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
}

export const kcal = (n: number) => `${num(Math.round(n), 0)} kcal`;
export const kg = (n: number) => `${num(n)} kg`;

/** Lê número digitado com vírgula ou ponto. Retorna null se vazio ou inválido. */
export function lerNumero(t: string | undefined): number | null {
  if (t == null) return null;
  const s = t.trim().replace(/\./g, (m, i, str) => (str.includes(',') ? '' : m)).replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Valor para um campo de texto (72.5 → "72,5"). */
export const campo = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

/** "Sexta, 16 de outubro" */
export function dataExtensa(iso: string): string {
  const d = paraData(iso);
  return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "16/10" */
export function dataCurta(iso: string): string {
  const d = paraData(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "16/10/2026" */
export function dataCompleta(iso: string): string {
  return `${dataCurta(iso)}/${paraData(iso).getFullYear()}`;
}

/** "Sexta, 16/10" */
export function diaSemanaCurta(iso: string): string {
  const d = paraData(iso);
  return `${cap(DIAS[d.getDay()])}, ${dataCurta(iso)}`;
}

export const diaSemanaSigla = (iso: string) => DIAS_CURTOS[paraData(iso).getDay()];
export const nomeMes = (iso: string) => cap(MESES[paraData(iso).getMonth()]);

/** "18:05" */
export function hora(isoDataHora: string): string {
  const d = new Date(isoDataHora);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "58 min" · "1h 20" */
export function duracao(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${String(r).padStart(2, '0')}` : `${h}h`;
}

/** "23:41" a partir de segundos. */
export function cronometro(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

/** "hoje", "ontem", "há 3 dias", "16/10" */
export function relativo(iso: string, hoje: string): string {
  const dias = Math.round((paraData(hoje).getTime() - paraData(iso.slice(0, 10)).getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return dataCurta(iso);
}

/** Converte "DD/MM/AAAA" em "AAAA-MM-DD" (ou null). */
export function lerDataBr(t: string): string | null {
  const m = t.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mm, a] = m;
  const iso = `${a}-${mm.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const dt = paraData(iso);
  return dt.getDate() === Number(d) && dt.getMonth() + 1 === Number(mm) ? iso : null;
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraData(ate).getTime() - paraData(de).getTime()) / 86400000);
}

/** Segunda-feira da semana da data. */
export function inicioDaSemana(iso: string): string {
  const d = paraData(iso).getDay();
  return somarDias(iso, d === 0 ? -6 : 1 - d);
}

export function plural(n: number, um: string, varios: string) {
  return `${num(n, 1)} ${n === 1 ? um : varios}`;
}

/** Máscara de digitação DD/MM/AAAA. */
export function mascaraData(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Máscara de digitação HH:MM. */
export function mascaraHora(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export const horaValida = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** "AAAA-MM-DD" → "DD/MM/AAAA" para campos. */
export const campoData = (iso: string | null | undefined) => (iso ? dataCompleta(iso) : '');
