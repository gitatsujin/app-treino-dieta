import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Droplet, Info } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Card, ChipGroup, Divider, FieldLabel, IconTile, ListRow, ProgressBar, Screen, Toggle, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { ciclos, definirCicloAtivo, encerrarMenstruacao, faseEm, salvarSintomasDoDia, SINTOMAS, sintomasDoDia, usuario } from '@/db/perfil';
import { dataCompleta, dataCurta, diasEntre, somarDias } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** Mensagens gerais de cuidado por fase, sem orientação médica (RN21). */
const MENSAGEM: Record<string, string> = {
  Menstrual: 'Nesse período lembre-se de se cuidar, suas forças estão menores, portanto pegue leve hoje.',
  Folicular: 'Muitas pessoas sentem mais disposição nesta fase.',
  Ovulatória: 'Fase de transição do ciclo. Siga como se sentir melhor.',
  Lútea: 'Nesta fase é comum sentir mais cansaço. Ajuste a intensidade do treino se precisar.',
};

/** Ciclo menstrual: fase atual, calendário com previsão e sintomas (RF51–RF55). */
export default function CicloMenstrual() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const d = useConsulta(() => ({ u: usuario(), lista: ciclos(), fase: faseEm(hoje), sintomas: sintomasDoDia(hoje) }));
  const [mes, setMes] = useState(hoje.slice(0, 7));

  if (!d.u || d.u.sexo !== 'feminino') {
    return (
      <Screen header={<TopBar title="Ciclo menstrual" />}>
        <Card>
          <AppText color="textMuted">O registro do ciclo está disponível para o sexo feminino (Perfil › Editar perfil).</AppText>
        </Card>
      </Screen>
    );
  }

  if (!d.u.ciclo_ativo) {
    return (
      <Screen header={<TopBar title="Ciclo menstrual" />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <IconTile icon={Droplet} tone="diet" />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Registrar ciclo menstrual</AppText>
              <AppText variant="caption" color="textMuted">
                Relaciona as fases do ciclo com o desempenho nos treinos. Os dados ficam só neste aparelho.
              </AppText>
            </View>
            <Toggle value={false} onChange={() => definirCicloAtivo(true)} />
          </View>
        </Card>
      </Screen>
    );
  }

  const atual = d.lista[0];
  const emCurso = atual && !atual.data_fim && diasEntre(atual.data_inicio, hoje) < 15;
  const proxima = d.fase?.proxima;
  const marcados = new Set<string>();
  for (const c of d.lista) {
    const fim = c.data_fim ?? (emCurso && c === atual ? hoje : somarDias(c.data_inicio, 4));
    for (let x = c.data_inicio; x <= fim; x = somarDias(x, 1)) marcados.add(x);
  }
  const previstos = new Set<string>();
  if (proxima) for (let i = 0; i < 5; i++) previstos.add(somarDias(proxima, i));

  const [a, m] = mes.split('-').map(Number);
  const primeiro = new Date(a, m - 1, 1);
  const diasNoMes = new Date(a, m, 0).getDate();
  const celulas: (string | null)[] = [...Array(primeiro.getDay()).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)];
  const mudarMes = (dir: number) => {
    const n = new Date(a, m - 1 + dir, 1);
    setMes(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
  };
  const toggleSintoma = (rotulo: string) => {
    const cod = Object.entries(SINTOMAS).find(([, l]) => l === rotulo)![0];
    salvarSintomasDoDia(hoje, d.sintomas.includes(cod) ? d.sintomas.filter((s) => s !== cod) : [...d.sintomas, cod]);
  };

  return (
    <Screen
      header={<TopBar title="Ciclo menstrual" />}
      footer={
        emCurso ? (
          <BottomActionBar secondary={{ label: 'Editar', onPress: () => router.push({ pathname: '/perfil/menstruacao', params: { id: atual.id } }) }} primary={{ label: 'Menstruação terminou', onPress: () => encerrarMenstruacao(atual.id, hoje) }} />
        ) : (
          <BottomActionBar primary={{ label: 'Menstruação começou', onPress: () => router.push('/perfil/menstruacao') }} />
        )
      }>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={Droplet} tone="diet" />
          <View style={{ gap: 2, flex: 1 }}>
            <AppText style={{ fontFamily: font.semibold, fontSize: 19 }}>{d.fase ? `Fase ${d.fase.fase.toLowerCase()}` : 'Sem registros'}</AppText>
            <AppText variant="bodySmall" color="textMuted">
              {d.fase ? `Dia ${d.fase.dia} de ${d.fase.duracaoCiclo} do ciclo` : 'Registre o início da sua última menstruação.'}
            </AppText>
          </View>
        </View>
        {d.fase ? (
          <>
            <ProgressBar value={Math.min(d.fase.dia, d.fase.duracaoCiclo)} max={d.fase.duracaoCiclo} color={colors.diet} />
            <AppText variant="bodySmall" style={{ fontFamily: font.medium }}>
              {diasEntre(hoje, d.fase.proxima) > 0
                ? `Próxima menstruação em cerca de ${diasEntre(hoje, d.fase.proxima)} dias (${dataCurta(d.fase.proxima)})`
                : `A menstruação prevista para ${dataCurta(d.fase.proxima)} ainda não foi registrada`}
            </AppText>
          </>
        ) : null}
      </Card>
      <Card>
        <View style={styles.month}>
          <Pressable accessibilityLabel="Mês anterior" hitSlop={10} onPress={() => mudarMes(-1)}>
            <ChevronLeft size={20} color={colors.textMuted} />
          </Pressable>
          <AppText variant="itemTitle">
            {MESES[m - 1]} {a}
          </AppText>
          <Pressable accessibilityLabel="Próximo mês" hitSlop={10} onPress={() => mudarMes(1)}>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, i) => (
            <View key={i} style={styles.cell}>
              <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
                {x}
              </AppText>
            </View>
          ))}
          {celulas.map((dia, i) => {
            if (!dia) return <View key={i} style={styles.cell} />;
            const eHoje = dia === hoje;
            const menstr = marcados.has(dia);
            const prev = !menstr && previstos.has(dia);
            return (
              <View key={i} style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    menstr && { backgroundColor: colors.tileDiet },
                    eHoje && { backgroundColor: colors.accent },
                    prev && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dietStrong },
                  ]}>
                  <AppText style={{ fontSize: 13, fontFamily: eHoje || menstr ? font.semibold : font.regular, color: eHoje ? colors.onAccent : menstr || prev ? colors.dietStrong : colors.text }}>
                    {Number(dia.slice(8))}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
          <AppText variant="caption" color="textMuted">
            ● Hoje
          </AppText>
          <AppText variant="caption" style={{ color: colors.dietStrong }}>
            ● Menstruação
          </AppText>
          <AppText variant="caption" style={{ color: colors.dietStrong }}>
            ◌ Previsão
          </AppText>
        </View>
      </Card>
      {d.lista.length ? (
        <>
          <FieldLabel>Sintomas de hoje</FieldLabel>
          <ChipGroup options={Object.values(SINTOMAS)} selected={d.sintomas.map((s) => SINTOMAS[s])} onChange={toggleSintoma} />
        </>
      ) : null}
      {d.fase ? <Banner icon={Info} tone="neutral" message={MENSAGEM[d.fase.fase]} /> : null}
      {d.lista.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {d.lista.slice(0, 6).map((c, i) => (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={dataCompleta(c.data_inicio)}
                subtitle={[c.data_fim ? `até ${dataCurta(c.data_fim)} · ${diasEntre(c.data_inicio, c.data_fim) + 1} dias` : 'em andamento', c.intensidade_fluxo ? `fluxo ${c.intensidade_fluxo}` : ''].filter(Boolean).join(' · ')}
                chevron
                onPress={() => router.push({ pathname: '/perfil/menstruacao', params: { id: c.id } })}
              />
            </View>
          ))}
        </Card>
      ) : null}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <AppText style={{ fontFamily: font.medium, fontSize: 15, flex: 1 }}>Registro do ciclo</AppText>
          <Toggle value onChange={() => definirCicloAtivo(false)} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
