import { agoraIso, definirDb, type Db } from './conexao';
import { MIGRACOES } from './esquema';
import { ALIMENTOS, EXERCICIOS, MAPA_NUT, NUTRIENTES } from './sementes';

/** Aplica as migrações pendentes e carrega os dados padrão. Idempotente. */
export function iniciarBanco(db: Db) {
  db.exec('PRAGMA foreign_keys = ON;');
  const v = db.get<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let i = v; i < MIGRACOES.length; i++) {
    db.tx(() => {
      db.exec(MIGRACOES[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    });
  }
  semear(db);
  definirDb(db);
}

function semear(db: Db) {
  const agora = agoraIso();
  db.tx(() => {
    NUTRIENTES.forEach(([id, nome, unidade, categoria, rec], ordem) =>
      db.run('INSERT OR IGNORE INTO nutriente (id, nome, unidade, categoria, recomendado_dia, ordem) VALUES (?,?,?,?,?,?)', [id, nome, unidade, categoria, rec, ordem]),
    );
    for (const [slug, nome, grupo, equip] of EXERCICIOS) {
      db.run(
        `INSERT OR IGNORE INTO exercicio (id, usuario_id, nome, grupo_muscular, equipamento, codigo_met, fonte, id_externo, criado_em, atualizado_em)
         VALUES (?, NULL, ?, ?, ?, '02054', 'base_aberta', ?, ?, ?)`,
        [`ex-${slug}`, nome, grupo, equip, slug, agora, agora],
      );
    }
    for (const [slug, nome, porcao, medida, nut] of ALIMENTOS) {
      const id = `al-${slug}`;
      db.run(
        `INSERT OR IGNORE INTO alimento (id, usuario_id, nome, fonte, porcao_padrao_g, medida_caseira, criado_em, atualizado_em)
         VALUES (?, NULL, ?, 'base_app', ?, ?, ?, ?)`,
        [id, nome, porcao, medida, agora, agora],
      );
      for (const [k, v] of Object.entries(nut)) {
        db.run('INSERT OR IGNORE INTO alimento_nutriente (alimento_id, nutriente_id, valor_por_100g) VALUES (?,?,?)', [id, MAPA_NUT[k as keyof typeof MAPA_NUT], v as number]);
      }
    }
  });
}
