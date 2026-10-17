import { agoraIso, definirDb, type Db } from './conexao';
import { MIGRACOES } from './esquema';
import { ALIMENTOS, ALIMENTOS_OCULTOS, EXERCICIOS, MAPA_NUT, NUTRIENTES, VERSAO_SEMENTES } from './sementes';
import TACO from './taco.json';

/** Aplica as migrações pendentes e carrega os dados padrão. Idempotente. */
export function iniciarBanco(db: Db) {
  // Chaves estrangeiras desligadas durante as migrações (recriar tabela não pode cascatear).
  db.exec('PRAGMA foreign_keys = OFF;');
  const v = db.get<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let i = v; i < MIGRACOES.length; i++) {
    db.tx(() => {
      db.exec(MIGRACOES[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    });
  }
  db.exec('PRAGMA foreign_keys = ON;');
  // As sementes só rodam quando mudam (cerca de 11 mil linhas com a TACO).
  const versao = db.get<{ valor: string }>("SELECT valor FROM preferencia WHERE chave = 'versao_sementes'")?.valor;
  if (versao !== String(VERSAO_SEMENTES)) {
    semear(db);
    db.run("INSERT INTO preferencia (chave, valor) VALUES ('versao_sementes', ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor", [String(VERSAO_SEMENTES)]);
  }
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
    // Alimentos da base inicial que a TACO substitui: somem da busca, mas registros antigos continuam válidos.
    for (const slug of ALIMENTOS_OCULTOS) db.run('UPDATE alimento SET excluido_em = ? WHERE id = ? AND excluido_em IS NULL', [agora, `al-${slug}`]);

    // TACO 4ª edição (NEPA/UNICAMP): valores por 100 g; "Tr" (traço) = 0; sem dado = sem linha.
    const { nutrientes, categorias, alimentos } = TACO as unknown as { nutrientes: string[]; categorias: string[]; alimentos: [number, string, number, (number | null)[]][] };
    for (const [n, nome, cat, valores] of alimentos) {
      const id = `taco-${n}`;
      db.run(
        `INSERT INTO alimento (id, usuario_id, nome, fonte, categoria, criado_em, atualizado_em) VALUES (?, NULL, ?, 'taco', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, categoria = excluded.categoria, atualizado_em = excluded.atualizado_em`,
        [id, nome, categorias[cat], agora, agora],
      );
      valores.forEach((v, i) => {
        if (v == null) return;
        db.run('INSERT INTO alimento_nutriente (alimento_id, nutriente_id, valor_por_100g) VALUES (?,?,?) ON CONFLICT DO UPDATE SET valor_por_100g = excluded.valor_por_100g', [id, nutrientes[i], v]);
      });
    }
  });
}
