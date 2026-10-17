import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, DateBadge, ListCard, ListRow, SectionHeader, Tag } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { faseEm } from '@/db/perfil';
import type { ItemHistorico } from '@/db/treino';
import { diaSemanaSigla, paraData } from '@/lib/formato';

/** Histórico recente; com o ciclo ativo, mostra a fase de cada sessão (RF54). */
export function Recentes({ itens, ciclo, titulo = 'Histórico recente' }: { itens: ItemHistorico[]; ciclo: boolean; titulo?: string }) {
  if (!itens.length) return null;
  return (
    <>
      <SectionHeader title={titulo} actionLabel="Ver tudo" onAction={() => router.push('/treino/historico')} />
      <ListCard>
        {itens.map((s) => (
          <LinhaHistorico key={s.id} s={s} ciclo={ciclo} />
        ))}
      </ListCard>
    </>
  );
}

export function LinhaHistorico({ s, ciclo }: { s: ItemHistorico; ciclo: boolean }) {
  const fase = useConsulta(() => (ciclo ? faseEm(s.inicio.slice(0, 10))?.fase : undefined), [ciclo, s.inicio]);
  return (
    <ListRow
      leading={<DateBadge weekday={diaSemanaSigla(s.inicio.slice(0, 10))} day={String(paraData(s.inicio.slice(0, 10)).getDate()).padStart(2, '0')} tone={s.tipo === 'treino' ? 'training' : 'diet'} />}
      title={s.titulo}
      subtitle={s.detalhe}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <AppText variant="button" style={{ fontSize: 13 }}>
            {s.valor}
          </AppText>
          {fase ? (
            <Tag label={fase} tone={fase === 'Menstrual' ? 'diet' : fase === 'Folicular' ? 'training' : 'neutral'} />
          ) : (
            <AppText variant="label" color="textMuted" style={{ fontFamily: 'Inter_400Regular' }}>
              {s.unidade}
            </AppText>
          )}
        </View>
      }
      onPress={() => router.push(s.tipo === 'treino' ? { pathname: '/treino/sessao', params: { id: s.id } } : { pathname: '/treino/aerobico', params: { id: s.id } })}
    />
  );
}

