import { router } from 'expo-router';
import { Info } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, BottomActionBar, Card, Divider, ListRow, Radio, Screen, TextField, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { dietaAtiva } from '@/db/dieta';
import { bios, definirMetaCalorias, tmb, usuario } from '@/db/perfil';
import { gastoAtividadesDoDia } from '@/db/treino';
import { campo, dataCurta, kcal, lerNumero, num, somarDias } from '@/lib/formato';
import { space } from '@/theme/tokens';

/** Meta de calorias (RF35, RF36, RN05, RN10). Com dieta ativa, a meta vem dela. */
export default function MetaCalorias() {
  const hoje = hojeIso();
  const d = useConsulta(() => {
    const dieta = dietaAtiva();
    const ativ = Array.from({ length: 7 }, (_, i) => gastoAtividadesDoDia(somarDias(hoje, -i)));
    return { dieta, u: usuario(), tmb: tmb(hoje), bio: bios().find((b) => b.metabolismo_repouso_kcal) ?? null, ativa: ativ.reduce((a, b) => a + b, 0) / 7 };
  });
  const [modo, setModo] = useState<'fixo' | 'sem'>(d.u?.meta_calorias_kcal ? 'fixo' : 'sem');
  const [valor, setValor] = useState(campo(d.u?.meta_calorias_kcal));
  const n = lerNumero(valor);
  const invalido = modo === 'fixo' && !(n && n >= 800 && n <= 8000);
  const metaDieta = d.dieta ? Math.round(d.dieta.valores.energia ?? 0) : null;
  const meta = metaDieta ?? (modo === 'fixo' && !invalido ? n : null);

  const salvar = () => {
    if (!d.dieta) {
      if (invalido) return;
      definirMetaCalorias(modo === 'fixo' ? Math.round(n!) : null);
    }
    router.back();
  };

  return (
    <Screen header={<TopBar title="Meta de calorias" />} footer={<BottomActionBar primary={{ label: d.dieta ? 'OK' : 'Salvar', onPress: salvar, disabled: invalido }} />}>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        <View style={{ opacity: d.dieta ? 1 : 0.45 }}>
          <ListRow title="Pela dieta" subtitle={d.dieta ? `${d.dieta.nome} · ${kcal(metaDieta!)} por dia` : 'Cadastre uma dieta para usar esta opção'} trailing={<Radio selected={!!d.dieta} />} />
        </View>
        <Divider />
        <View style={{ opacity: d.dieta ? 0.45 : 1 }}>
          <ListRow title="Valor fixo" subtitle="Você define quantas calorias por dia" trailing={<Radio selected={!d.dieta && modo === 'fixo'} />} onPress={d.dieta ? undefined : () => setModo('fixo')} />
        </View>
        <Divider />
        <View style={{ opacity: d.dieta ? 0.45 : 1 }}>
          <ListRow title="Sem meta" subtitle="Só acompanhar o que comeu" trailing={<Radio selected={!d.dieta && modo === 'sem'} />} onPress={d.dieta ? undefined : () => setModo('sem')} />
        </View>
      </Card>
      {!d.dieta && modo === 'fixo' ? <TextField label="Calorias por dia" value={valor} onChangeText={setValor} placeholder="2.000" unit="kcal" keyboardType="number-pad" warning={!!valor && invalido} /> : null}
      {d.dieta ? <Banner icon={Info} tone="neutral" message="Com uma dieta ativa, a meta vem dela. As outras opções ficam disponíveis quando não houver dieta." /> : null}
      {meta ? (
        <Card gap={space.sm}>
          <AppText variant="itemTitle">Margem da meta</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Um dia conta como dentro da meta quando o consumo fica a até 7% dela: entre {num(Math.round(meta * 0.93), 0)} e {num(Math.round(meta * 1.07), 0)} kcal.
          </AppText>
        </Card>
      ) : null}
      <Card gap={0}>
        <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
          Seu gasto médio (7 dias)
        </AppText>
        {[
          ['Metabolismo basal', d.tmb?.origem === 'bioimpedancia' && d.bio ? `Pela bioimpedância de ${dataCurta(d.bio.data)}` : 'Pela fórmula de Mifflin-St Jeor', num(d.tmb?.kcal ?? 0, 0)],
          ['Energia ativa', 'Treinos e aeróbicos registrados', `+ ${num(Math.round(d.ativa), 0)}`],
          ['Gasto total', 'Média por dia', kcal((d.tmb?.kcal ?? 0) + d.ativa)],
        ].map(([t, s, v]) => (
          <View key={t}>
            <Divider />
            <ListRow title={t} subtitle={s} trailing={<AppText variant="itemTitle">{v}</AppText>} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
