import { openDatabaseSync } from 'expo-sqlite';

import type { Db, Valor } from './conexao';
import { iniciarBanco } from './iniciar';

let aberto = false;

/** Abre o banco do aparelho (arquivo treino-dieta.db) e aplica migrações. */
export function abrirBancoDoAparelho() {
  if (aberto) return;
  const sqlite = openDatabaseSync('treino-dieta.db');
  const db: Db = {
    exec: (sql) => sqlite.execSync(sql),
    run: (sql, params: Valor[] = []) => {
      sqlite.runSync(sql, params);
    },
    all: <T,>(sql: string, params: Valor[] = []) => sqlite.getAllSync<T>(sql, params),
    get: <T,>(sql: string, params: Valor[] = []) => sqlite.getFirstSync<T>(sql, params) ?? undefined,
    tx: (fn) => sqlite.withTransactionSync(fn),
  };
  iniciarBanco(db);
  aberto = true;
}
