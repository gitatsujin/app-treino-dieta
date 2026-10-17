/** Metas de carga, frequência, peso corporal e dieta (RF12, RF13, RF28–RF33). Progresso calculado na hora. */
import { dataCurta, diasEntre, num, somarDias } from '@/lib/formato';

import { atualizar, db, excluir, gravar, hojeIso, inserir } from './conexao';
import { diasSeguidosNaDieta, metaCaloricaDoDia } from './dieta';
import { pesoAtual } from './perfil';
import { exercicio, maiorCarga, semana } from './treino';

export type TipoMeta = 'carga' | 'frequencia' | 'peso' | 'dieta';

export type MetaReg = {
  id: string;
  tipo: TipoMeta;
  exercicio_id: string | null;
  carga_alvo_kg: number | null;
  treinos_semana: number | null;
  aerobicos_semana: number | null;
  peso_alvo_kg: number | null;
  peso_inicial_kg: number | null;
  dias_dieta_alvo: number | null;
  data_inicio: string;
  prazo: string | null;
  status: 'ativa' | 'atingida' | 'cancelada';
  atingida_em: string | null;
};

export const ROTULO_TIPO: Record<TipoMeta, string> = { carga: 'Carga', frequencia: 'Frequência', peso: 'Peso corporal', dieta: 'Dieta' };

export function metas(status: MetaReg['status'] = 'ativa'): MetaReg[] {
  return db().all<MetaReg>(
    `SELECT * FROM meta WHERE status = ? AND excluido_em IS NULL ORDER BY ${status === 'atingida' ? 'atingida_em DESC' : 'criado_em'}`,
    [status],
  );
}

export function meta(id: string): MetaReg | null {
  return db().get<MetaReg>('SELECT * FROM meta WHERE id = ? AND excluido_em IS NULL', [id]) ?? null;
}

export type MetaEntrada = Omit<MetaReg, 'id' | 'status' | 'atingida_em' | 'data_inicio' | 'peso_inicial_kg'>;

export function salvarMeta(m: MetaEntrada, id?: string) {
  return gravar(() => {
    if (id) {
      atualizar('meta', id, m);
      return id;
    }
    return inserir('meta', { ...m, data_inicio: hojeIso(), status: 'ativa', peso_inicial_kg: m.tipo === 'peso' ? (pesoAtual()?.peso_kg ?? null) : null });
  });
}

export function excluirMeta(id: string) {
  gravar(() => excluir('meta', id));
}

export type Progresso = {
  p: number;
  titulo: string;
  valor?: string;
  de?: string;
  esquerda: string;
  direita: string;
  frase: string;
  treinos?: { feito: number; alvo: number };
  aerobicos?: { feito: number; alvo: number };
};

const prazoTxt = (m: MetaReg) => (m.prazo ? `Prazo: ${dataCurta(m.prazo)}` : 'Sem prazo');
const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function progresso(m: MetaReg, hoje = hojeIso()): Progresso {
  switch (m.tipo) {
    case 'carga': {
      const nome = exercicio(m.exercicio_id!)?.nome ?? 'Exercício';
      const atual = maiorCarga(m.exercicio_id!) ?? 0;
      const alvo = m.carga_alvo_kg!;
      const falta = Math.max(0, alvo - atual);
      return {
        p: clamp(atual / alvo),
        titulo: `${nome}: ${num(alvo)} kg`,
        valor: `${num(atual)} kg`,
        de: `de ${num(alvo)} kg`,
        esquerda: `${num(atual)} kg de ${num(alvo)} kg`,
        direita: prazoTxt(m),
        frase: atual ? (falta ? `Faltam ${num(falta)} kg.` : 'Meta batida!') : 'Registre um treino com este exercício para acompanhar.',
      };
    }
    case 'frequencia': {
      const s = semana(hoje);
      const tA = m.treinos_semana ?? 0;
      const aA = m.aerobicos_semana ?? 0;
      const tF = Math.min(s.treinos, tA);
      const aF = Math.min(s.aerobicos, aA);
      const total = tA + aA;
      const faltam: string[] = [];
      if (tA - tF > 0) faltam.push(`${tA - tF} treino${tA - tF === 1 ? '' : 's'}`);
      if (aA - aF > 0) faltam.push(`${aA - aF} aeróbico${aA - aF === 1 ? '' : 's'}`);
      const restam = diasEntre(hoje, s.fim);
      const partes = [tA ? `${tA} treino${tA === 1 ? '' : 's'}` : '', aA ? `${aA} aeróbico${aA === 1 ? '' : 's'}` : ''].filter(Boolean);
      return {
        p: total ? (tF + aF) / total : 0,
        titulo: `${partes.join(' e ')} por semana`,
        esquerda: `Semana de ${dataCurta(s.inicio)} a ${dataCurta(s.fim)}`,
        direita: restam ? `${restam} dia${restam === 1 ? '' : 's'} restante${restam === 1 ? '' : 's'}` : 'Último dia',
        frase: faltam.length
          ? `${faltam.length === 1 && faltam[0].startsWith('1 ') ? 'Falta' : 'Faltam'} ${faltam.join(' e ')} para fechar a semana.`
          : 'Meta da semana batida!',
        treinos: tA ? { feito: s.treinos, alvo: tA } : undefined,
        aerobicos: aA ? { feito: s.aerobicos, alvo: aA } : undefined,
      };
    }
    case 'peso': {
      const atual = pesoAtual()?.peso_kg ?? m.peso_inicial_kg ?? 0;
      const ini = m.peso_inicial_kg ?? atual;
      const alvo = m.peso_alvo_kg!;
      const p = ini === alvo ? 1 : clamp((ini - atual) / (ini - alvo));
      const falta = Math.abs(atual - alvo);
      let ritmo = '';
      if (m.prazo && falta > 0.05) {
        const semanas = diasEntre(hoje, m.prazo) / 7;
        if (semanas > 0) ritmo = ` Cerca de ${num(falta / semanas)} kg por semana até ${dataCurta(m.prazo)}.`;
      }
      return {
        p,
        titulo: `Chegar a ${num(alvo)} kg`,
        valor: `${num(atual)} kg`,
        de: `meta ${num(alvo)} kg`,
        esquerda: `${num(atual)} kg agora · início ${num(ini)} kg`,
        direita: prazoTxt(m),
        frase: falta > 0.05 ? `Faltam ${num(falta)} kg.${ritmo}` : 'Meta batida!',
      };
    }
    case 'dieta': {
      const alvo = m.dias_dieta_alvo!;
      const feito = diasSeguidosNaDieta(hoje, m.data_inicio);
      const meta = metaCaloricaDoDia().kcal;
      return {
        p: clamp(feito / alvo),
        titulo: `${alvo} dias seguidos na dieta`,
        valor: `${feito} dia${feito === 1 ? '' : 's'}`,
        de: `de ${alvo}`,
        esquerda: `${feito} de ${alvo} dias`,
        direita: 'Margem de ±7%',
        frase: meta
          ? `Um dia conta quando as calorias ficam entre ${num(Math.round(meta * 0.93), 0)} e ${num(Math.round(meta * 1.07), 0)} kcal. Um dia fora zera a sequência.`
          : 'Cadastre uma dieta para a sequência começar a contar.',
      };
    }
  }
}

/** Marca como atingidas as metas que chegaram a 100% e devolve as recém-atingidas. Frequência renova toda semana. */
export function verificarMetas(hoje = hojeIso()): MetaReg[] {
  const novas = metas('ativa').filter((m) => m.tipo !== 'frequencia' && progresso(m, hoje).p >= 1);
  if (novas.length) gravar(() => novas.forEach((m) => atualizar('meta', m.id, { status: 'atingida', atingida_em: hoje })));
  return novas;
}

/** Semanas anteriores de uma meta de frequência. */
export function semanasAnteriores(m: MetaReg, n = 4, hoje = hojeIso()) {
  const out: { inicio: string; fim: string; treinos: number; aerobicos: number; batida: boolean }[] = [];
  for (let i = 1; i <= n; i++) {
    const d = somarDias(hoje, -7 * i);
    const s = semana(d);
    if (s.fim < m.data_inicio) break;
    out.push({ inicio: s.inicio, fim: s.fim, treinos: s.treinos, aerobicos: s.aerobicos, batida: s.treinos >= (m.treinos_semana ?? 0) && s.aerobicos >= (m.aerobicos_semana ?? 0) });
  }
  return out;
}
