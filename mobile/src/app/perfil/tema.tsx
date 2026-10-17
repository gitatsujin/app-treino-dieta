import { StyleSheet, View } from 'react-native';

import { AppText, Card, Divider, ListRow, Radio, Screen, TopBar } from '@/components/ui';
import { colors as palette, radius, space } from '@/theme/tokens';
import { useConsulta } from '@/db/conexao';
import { definirPref, pref } from '@/db/perfil';
import { useTheme } from '@/theme/use-theme';

const VALOR: Record<string, string | null> = { Automático: null, Claro: 'claro', Escuro: 'escuro' };

/** Tema: automático (segue o sistema), claro ou escuro. Aplica na hora. */
export default function Tema() {
  const { colors } = useTheme();
  const salvo = useConsulta(() => pref('tema'));
  const tema = salvo === 'claro' ? 'Claro' : salvo === 'escuro' ? 'Escuro' : 'Automático';
  const setTema = (t: string) => definirPref('tema', VALOR[t]);
  return (
    <Screen header={<TopBar title="Tema" />}>
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        {(['light', 'dark'] as const).map((k) => {
          const p = palette[k];
          return (
            <View key={k} style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
              <View style={[styles.mini, { backgroundColor: p.background, borderColor: colors.track }]}>
                <View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: p.text }} />
                <View style={[styles.miniCard, { backgroundColor: p.surface }]}>
                  <View style={{ width: 70, height: 6, borderRadius: 3, backgroundColor: p.textMuted }} />
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: p.track }} />
                  <View style={{ width: 80, height: 6, borderRadius: 3, backgroundColor: p.accent }} />
                </View>
                <View style={{ height: 18, borderRadius: 7, backgroundColor: p.accent }} />
              </View>
              <AppText variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
                {k === 'light' ? 'Claro · Verde vital' : 'Escuro · Energia esportiva'}
              </AppText>
            </View>
          );
        })}
      </View>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {[
          ['Automático', 'Segue o tema do sistema'],
          ['Claro', 'Sempre o tema claro'],
          ['Escuro', 'Sempre o tema escuro'],
        ].map(([t, s], i) => (
          <View key={t}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={t} subtitle={s} trailing={<Radio selected={tema === t} />} onPress={() => setTema(t)} />
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="textMuted">
        A troca vale na hora, sem precisar salvar.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mini: { alignSelf: 'stretch', borderRadius: 18, borderWidth: 1, padding: 12, gap: 8 },
  miniCard: { borderRadius: radius.button - 4, padding: 10, gap: 6 },
});
