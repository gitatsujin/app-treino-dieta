import { router, useLocalSearchParams } from 'expo-router';
import { Camera, FileText, Image as ImageIcon, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Banner, Button, IconTile } from '@/components/ui';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const OPCOES: [LucideIcon, string, string][] = [
  [Camera, 'Tirar foto', 'Dieta impressa ou escrita à mão'],
  [ImageIcon, 'Escolher da galeria', 'Foto ou print já salvo'],
  [FileText, 'Escolher PDF', 'Arquivo enviado pelo nutricionista'],
];

const ALVOS = {
  dieta: { titulo: 'Importar dieta', texto: 'Envie a dieta do nutricionista. Você revisa tudo antes de salvar.', manual: '/dieta/editar' },
  treino: { titulo: 'Importar ficha', texto: 'Envie a ficha da academia. Você revisa tudo antes de salvar.', manual: '/treino/plano' },
  bio: { titulo: 'Importar laudo', texto: 'Envie o laudo da bioimpedância. Você revisa tudo antes de salvar.', manual: '/perfil/bioimpedancia' },
} as const;

/**
 * Origem da importação (painel por cima da tela atual). Vale para dieta, ficha de treino e laudo.
 * A leitura automática por foto ou PDF depende de um serviço de reconhecimento (etapa 3 do MVP);
 * até lá, o painel mostra as opções e leva ao cadastro manual.
 */
export default function OrigemImportacao() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alvo = 'dieta' } = useLocalSearchParams<{ alvo?: keyof typeof ALVOS }>();
  const a = ALVOS[alvo] ?? ALVOS.dieta;
  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.xl) + space.md }]}>
        <View style={[styles.handle, { backgroundColor: colors.track }]} />
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>{a.titulo}</AppText>
        <AppText color="textMuted">{a.texto}</AppText>
        {OPCOES.map(([Icon, t, s]) => (
          <View key={t} style={[styles.option, { backgroundColor: colors.background, opacity: 0.5 }]}>
            <IconTile icon={Icon} tone="diet" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="itemTitle">{t}</AppText>
              <AppText variant="caption" color="textMuted">
                {s}
              </AppText>
            </View>
          </View>
        ))}
        <Banner icon={Sparkles} tone="neutral" message="A leitura automática por foto e PDF chega em breve. Por enquanto, cadastre manualmente: leva poucos minutos." />
        <Button label="Cadastrar manualmente" onPress={() => router.replace(a.manual)} />
        <Button variant="secondary" label="Cancelar" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.xl, paddingTop: space.md, gap: space.lg },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderRadius: radius.shortcut, padding: space.lg },
});
