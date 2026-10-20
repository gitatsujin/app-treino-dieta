import { useMemo, useSyncExternalStore } from 'react';

/**
 * Acesso ao banco local. As telas não importam o expo-sqlite direto: usam as funções
 * dos repositórios (usuario.ts, treino.ts, dieta.ts…), que falam com esta interface.
 * Assim o mesmo código roda no app (expo-sqlite) e nos testes (better-sqlite3).
 */
export type Valor = string | number | null;

export type Db = {
  exec(sql: string): void;
  run(sql: string, params?: Valor[]): void;
  all<T>(sql: string, params?: Valor[]): T[];
  get<T>(sql: string, params?: Valor[]): T | undefined;
  tx(fn: () => void): void;
};

let atual: Db | null = null;

export function definirDb(db: Db) {
  atual = db;
}

export function db(): Db {
  if (!atual) throw new Error('Banco ainda não foi aberto');
  return atual;
}

/* ---------- Reatividade: toda escrita avisa as telas para reler ---------- */

let versao = 0;
const ouvintes = new Set<() => void>();

export function avisarMudanca() {
  versao++;
  ouvintes.forEach((o) => o());
}

/** Ouve qualquer escrita no banco (fora de componentes). Devolve a função para parar de ouvir. */
export function aoMudar(cb: () => void): () => void {
  ouvintes.add(cb);
  return () => ouvintes.delete(cb);
}

function useVersao() {
  return useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    () => versao,
  );
}

/** Lê do banco e relê sempre que algo for gravado. */
export function useConsulta<T>(ler: () => T, deps: unknown[] = []): T {
  const v = useVersao();
  return useMemo(ler, [v, ...deps]);
}

/** Executa uma escrita dentro de transação e avisa as telas. */
let profundidade = 0;
export function gravar<T>(fn: () => T): T {
  if (profundidade > 0) return fn();
  let r!: T;
  profundidade++;
  try {
    db().tx(() => {
      r = fn();
    });
  } finally {
    profundidade--;
  }
  avisarMudanca();
  return r;
}

/* ---------- Utilidades ---------- */

export function novoId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Data-hora atual em ISO 8601 com fuso local (ex.: 2026-10-17T09:30:00-03:00). */
export function agoraIso(d = new Date()): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sinal}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}

/** Data local AAAA-MM-DD. */
export function hojeIso(d = new Date()): string {
  return agoraIso(d).slice(0, 10);
}

/** Insere uma linha preenchendo id, usuario_id e auditoria. */
export function inserir(tabela: string, dados: Record<string, Valor | undefined>, opts: { semUsuario?: boolean } = {}): string {
  const id = (dados.id as string) ?? novoId();
  const agora = agoraIso();
  const linha: Record<string, Valor> = { id, criado_em: agora, atualizado_em: agora };
  if (!opts.semUsuario) linha.usuario_id = USUARIO_ID;
  for (const [k, v] of Object.entries(dados)) if (v !== undefined) linha[k] = v;
  const cols = Object.keys(linha);
  db().run(`INSERT INTO ${tabela} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => linha[c]));
  return id;
}

/** Atualiza colunas de uma linha e marca atualizado_em. */
export function atualizar(tabela: string, id: string, dados: Record<string, Valor | undefined>) {
  const pares = Object.entries(dados).filter(([, v]) => v !== undefined) as [string, Valor][];
  pares.push(['atualizado_em', agoraIso()]);
  db().run(`UPDATE ${tabela} SET ${pares.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`, [...pares.map(([, v]) => v), id]);
}

/** Exclusão lógica (o registro some das telas, mas a exclusão pode ser sincronizada depois). */
export function excluir(tabela: string, id: string) {
  const agora = agoraIso();
  db().run(`UPDATE ${tabela} SET excluido_em = ?, atualizado_em = ? WHERE id = ?`, [agora, agora, id]);
}

/** No MVP há um único usuário no aparelho; o id fixo facilita migrar para contas (RNF07). */
export const USUARIO_ID = 'usuario-local';
