import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, BottomActionBar, Card, Screen, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { iniciarSessao, melhorSerie, prescricao, proximoTreino, sessaoAberta, textoSerie, tituloTreino, ultimaVez } from '@/db/treino';
import { diaSemanaCurta } from '@/lib/formato';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Treino de hoje: aberto pelo "Ver treino" da Início, por cima, com X para fechar. */
export default function TreinoDeHoje() {
  const { colors } = useTheme();
  const d = useConsulta(() => {
    const t = proximoTreino();
    return {
      t,
      aberta: !!sessaoAberta(),
      itens: (t?.itens ?? []).map((i) => {
        const u = i.exercicio_id ? ultimaVez(i.exercicio_id) : null;
        return { i, ultima: u ? textoSerie(melhorSerie(u.series)) : '' };
      }),
    };
  });
  const iniciar = () => {
    if (d.t && !d.aberta) iniciarSessao({ treinoModeloId: d.t.id });
    router.replace('/treino/andamento');
  };
  return (
    <Screen
      header={<TopBar title={d.t ? tituloTreino(d.t) : 'Treino de hoje'} subtitle={diaSemanaCurta(hojeIso())} leading="close" />}
      footer={d.t ? <BottomActionBar primary={{ label: d.aberta ? 'Continuar treino' : 'Iniciar treino', onPress: iniciar }} /> : undefined}>
      {d.t ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {d.itens.map(({ i: e, ultima }, n) => (
            <View key={e.id} style={[styles.row, n > 0 && { borderTopWidth: 1, borderTopColor: colors.track }]}>
              <View style={[styles.num, { backgroundColor: colors.track }]}>
                <AppText variant="caption" color="textMuted">
                  {n + 1}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="itemTitle">{e.exercicio_nome ?? prescricao(e)}</AppText>
                <AppText variant="caption" color="textMuted">
                  {e.tipo_aerobico ? 'Aeróbico' : prescricao(e)}
                  {ultima ? ` · última: ${ultima}` : ''}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card>
          <AppText color="textMuted">Você ainda não tem um plano de treino. Crie um na aba Treino.</AppText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: space.xxs },
});
