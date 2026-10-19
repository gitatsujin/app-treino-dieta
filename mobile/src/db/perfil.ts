/** Usuário, preferências, peso, bioimpedância e ciclo menstrual. */
import { classeGordura, classeImc, classeMusculo, classeVisceral, faseDoCiclo, idade, imc, tmbMifflin, type Sexo } from '@/lib/calculos';

import { agoraIso, atualizar, db, excluir, gravar, hojeIso, inserir, USUARIO_ID } from './conexao';

export type Usuario = {
  id: string;
  nome: string;
  data_nascimento: string;
  sexo: Sexo;
  altura_cm: number;
  meta_calorias_kcal: number | null;
  ciclo_ativo: number;
};

/* ---------- Preferências ---------- */

export function pref(chave: string): string | null {
  return db().get<{ valor: string | null }>('SELECT valor FROM preferencia WHERE chave = ?', [chave])?.valor ?? null;
}

export function definirPref(chave: string, valor: string | null) {
  gravar(() => db().run('INSERT INTO preferencia (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor', [chave, valor]));
}

/* ---------- Usuário ---------- */

export function usuario(): Usuario | null {
  return db().get<Usuario>('SELECT * FROM usuario WHERE id = ? AND excluido_em IS NULL', [USUARIO_ID]) ?? null;
}

export function salvarUsuario(d: { nome: string; data_nascimento: string; sexo: Sexo; altura_cm: number; peso_kg?: number | null }) {
  gravar(() => {
    const existe = usuario();
    const ciclo = d.sexo === 'feminino' ? (existe?.ciclo_ativo ?? 0) : 0;
    if (existe) atualizar('usuario', USUARIO_ID, { nome: d.nome, data_nascimento: d.data_nascimento, sexo: d.sexo, altura_cm: d.altura_cm, ciclo_ativo: ciclo });
    else inserir('usuario', { id: USUARIO_ID, nome: d.nome, data_nascimento: d.data_nascimento, sexo: d.sexo, altura_cm: d.altura_cm, ciclo_ativo: 0 }, { semUsuario: true });
    if (d.peso_kg && d.peso_kg !== pesoAtual()?.peso_kg) registrarPeso(d.peso_kg);
  });
}

export function definirMetaCalorias(kcal: number | null) {
  gravar(() => atualizar('usuario', USUARIO_ID, { meta_calorias_kcal: kcal }));
}

export function definirCicloAtivo(ativo: boolean) {
  gravar(() => atualizar('usuario', USUARIO_ID, { ciclo_ativo: ativo ? 1 : 0 }));
}

export const primeiroNome = (u: Usuario | null) => (u?.nome.trim().split(/\s+/)[0] ?? '');

/* ---------- Peso ---------- */

export type RegistroPeso = { id: string; data: string; peso_kg: number; origem: string };

export function pesos(): RegistroPeso[] {
  return db().all<RegistroPeso>('SELECT id, data, peso_kg, origem FROM registro_peso WHERE excluido_em IS NULL ORDER BY data DESC, criado_em DESC');
}

export function pesoAtual(): RegistroPeso | null {
  return pesos()[0] ?? null;
}

export function registrarPeso(peso_kg: number, data = hojeIso(), origem: 'manual' | 'bioimpedancia' = 'manual', bioimpedancia_id?: string) {
  return gravar(() => {
    // Uma pesagem manual por dia: registrar de novo no mesmo dia substitui.
    if (origem === 'manual') {
      const mesmo = db().get<{ id: string }>("SELECT id FROM registro_peso WHERE data = ? AND origem = 'manual' AND excluido_em IS NULL", [data]);
      if (mesmo) {
        atualizar('registro_peso', mesmo.id, { peso_kg });
        return mesmo.id;
      }
    }
    return inserir('registro_peso', { data, peso_kg, origem, bioimpedancia_id });
  });
}

export function excluirPeso(id: string) {
  gravar(() => excluir('registro_peso', id));
}

/* ---------- Bioimpedância ---------- */

export type Bio = {
  id: string;
  data: string;
  peso_kg: number;
  cintura_cm: number | null;
  gordura_pct: number | null;
  musculo_esqueletico_pct: number | null;
  metabolismo_repouso_kcal: number | null;
  idade_biologica: number | null;
  gordura_visceral_nivel: number | null;
};

export function bios(): Bio[] {
  return db().all<Bio>('SELECT * FROM bioimpedancia WHERE excluido_em IS NULL ORDER BY data DESC, criado_em DESC');
}

export function salvarBio(b: Omit<Bio, 'id'> & { importacao_id?: string }, id?: string) {
  return gravar(() => {
    if (id) {
      atualizar('bioimpedancia', id, b);
      const p = db().get<{ id: string }>('SELECT id FROM registro_peso WHERE bioimpedancia_id = ? AND excluido_em IS NULL', [id]);
      if (p) atualizar('registro_peso', p.id, { peso_kg: b.peso_kg, data: b.data });
      return id;
    }
    const novo = inserir('bioimpedancia', b);
    registrarPeso(b.peso_kg, b.data, 'bioimpedancia', novo);
    return novo;
  });
}

export function excluirBio(id: string) {
  gravar(() => {
    excluir('bioimpedancia', id);
    db().run('UPDATE registro_peso SET excluido_em = ? WHERE bioimpedancia_id = ?', [agoraIso(), id]);
  });
}

export type Medida = { nome: string; valor: string; numero: number | null; classe?: string };

/** Medidas do exame com classificação (RF49). */
export function medidasDaBio(b: Bio, u: Usuario, hoje = hojeIso()): Medida[] {
  const anos = idade(u.data_nascimento, hoje);
  const f = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const v = imc(b.peso_kg, u.altura_cm);
  const out: Medida[] = [];
  if (b.gordura_pct != null) out.push({ nome: 'Gordura corporal', valor: `${f(b.gordura_pct)}%`, numero: b.gordura_pct, classe: classeGordura(u.sexo, anos, b.gordura_pct) });
  if (b.musculo_esqueletico_pct != null)
    out.push({ nome: 'Músculo esquelético', valor: `${f(b.musculo_esqueletico_pct)}%`, numero: b.musculo_esqueletico_pct, classe: classeMusculo(u.sexo, anos, b.musculo_esqueletico_pct) });
  if (b.gordura_visceral_nivel != null) out.push({ nome: 'Gordura visceral', valor: `Nível ${b.gordura_visceral_nivel}`, numero: b.gordura_visceral_nivel, classe: classeVisceral(b.gordura_visceral_nivel) });
  out.push({ nome: 'IMC', valor: f(v), numero: v, classe: classeImc(v) });
  if (b.metabolismo_repouso_kcal != null) out.push({ nome: 'Metabolismo em repouso', valor: `${b.metabolismo_repouso_kcal.toLocaleString('pt-BR')} kcal`, numero: b.metabolismo_repouso_kcal });
  if (b.idade_biologica != null) out.push({ nome: 'Idade biológica', valor: `${b.idade_biologica} anos`, numero: b.idade_biologica });
  out.push({ nome: 'Peso', valor: `${f(b.peso_kg)} kg`, numero: b.peso_kg });
  if (b.cintura_cm != null) out.push({ nome: 'Cintura', valor: `${f(b.cintura_cm)} cm`, numero: b.cintura_cm });
  return out;
}

/* ---------- TMB (RN08, RN09, RN14) ---------- */

export function tmb(hoje = hojeIso()): { kcal: number; origem: 'bioimpedancia' | 'formula' } | null {
  const b = db().get<{ metabolismo_repouso_kcal: number }>(
    'SELECT metabolismo_repouso_kcal FROM bioimpedancia WHERE metabolismo_repouso_kcal IS NOT NULL AND excluido_em IS NULL ORDER BY data DESC LIMIT 1',
  );
  if (b) return { kcal: b.metabolismo_repouso_kcal, origem: 'bioimpedancia' };
  const u = usuario();
  const p = pesoAtual();
  if (!u || !p) return null;
  return { kcal: Math.round(tmbMifflin(p.peso_kg, u.altura_cm, idade(u.data_nascimento, hoje), u.sexo)), origem: 'formula' };
}

/* ---------- Ciclo menstrual ---------- */

export type CicloReg = { id: string; data_inicio: string; data_fim: string | null; intensidade_fluxo: string | null };

export function ciclos(): CicloReg[] {
  return db().all<CicloReg>('SELECT id, data_inicio, data_fim, intensidade_fluxo FROM ciclo_menstrual WHERE excluido_em IS NULL ORDER BY data_inicio DESC');
}

export function sintomasDoCiclo(cicloId: string): string[] {
  return db()
    .all<{ sintoma: string }>('SELECT DISTINCT sintoma FROM sintoma_ciclo WHERE ciclo_menstrual_id = ? AND excluido_em IS NULL', [cicloId])
    .map((s) => s.sintoma);
}

export function salvarCiclo(d: { data_inicio: string; data_fim: string | null; intensidade_fluxo: string | null; sintomas: string[] }, id?: string) {
  return gravar(() => {
    const cid = id ?? inserir('ciclo_menstrual', { data_inicio: d.data_inicio, data_fim: d.data_fim, intensidade_fluxo: d.intensidade_fluxo });
    if (id) atualizar('ciclo_menstrual', id, { data_inicio: d.data_inicio, data_fim: d.data_fim, intensidade_fluxo: d.intensidade_fluxo });
    db().run('UPDATE sintoma_ciclo SET excluido_em = ? WHERE ciclo_menstrual_id = ? AND data = ? AND excluido_em IS NULL', [agoraIso(), cid, d.data_inicio]);
    for (const s of d.sintomas) inserir('sintoma_ciclo', { ciclo_menstrual_id: cid, data: d.data_inicio, sintoma: s });
    return cid;
  });
}

export const SINTOMAS: Record<string, string> = { colica: 'Cólica', fadiga: 'Fadiga', dor_cabeca: 'Dor de cabeça', inchaco: 'Inchaço', outro: 'Outro' };

/** Sintomas registrados num dia (ligados ao ciclo em curso nessa data). */
export function sintomasDoDia(data: string): string[] {
  return db()
    .all<{ sintoma: string }>('SELECT DISTINCT sintoma FROM sintoma_ciclo WHERE data = ? AND excluido_em IS NULL', [data])
    .map((s) => s.sintoma);
}

export function salvarSintomasDoDia(data: string, sintomas: string[]) {
  gravar(() => {
    const c = db().get<{ id: string }>('SELECT id FROM ciclo_menstrual WHERE data_inicio <= ? AND excluido_em IS NULL ORDER BY data_inicio DESC LIMIT 1', [data]);
    if (!c) return;
    db().run('UPDATE sintoma_ciclo SET excluido_em = ? WHERE data = ? AND excluido_em IS NULL', [agoraIso(), data]);
    for (const s of sintomas) inserir('sintoma_ciclo', { ciclo_menstrual_id: c.id, data, sintoma: s });
  });
}

export function encerrarMenstruacao(id: string, data = hojeIso()) {
  gravar(() => atualizar('ciclo_menstrual', id, { data_fim: data }));
}

export function excluirCiclo(id: string) {
  gravar(() => excluir('ciclo_menstrual', id));
}

/** Fase do ciclo numa data, ou null se o registro do ciclo estiver desligado ou sem dados. */
export function faseEm(data: string) {
  const u = usuario();
  if (!u?.ciclo_ativo) return null;
  return faseDoCiclo(ciclos(), data);
}

/* ---------- Apagar tudo (LGPD, RNF03) ---------- */

export function apagarTodosOsDados() {
  const tabelas = [
    'sintoma_ciclo', 'ciclo_menstrual', 'consumo', 'refeicao_modelo_item', 'refeicao_modelo', 'dieta', 'serie', 'sessao_exercicio',
    'sessao_aerobico', 'sessao_treino', 'treino_modelo_item', 'treino_modelo', 'plano_treino', 'meta', 'registro_peso', 'bioimpedancia',
    'importacao', 'integracao', 'gasto_ativo_diario', 'usuario', 'preferencia',
  ];
  gravar(() => {
    for (const t of tabelas) db().run(`DELETE FROM ${t}`);
    db().run('DELETE FROM alimento_nutriente WHERE alimento_id IN (SELECT id FROM alimento WHERE usuario_id IS NOT NULL)');
    db().run('DELETE FROM alimento WHERE usuario_id IS NOT NULL');
    db().run('DELETE FROM exercicio WHERE usuario_id IS NOT NULL');
  });
}
