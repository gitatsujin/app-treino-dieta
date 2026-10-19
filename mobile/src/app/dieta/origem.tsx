import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight, FileText, Image as ImageIcon, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconTile } from '@/components/ui';
import { escolherArquivo, type Alvo, type Origem } from '@/lib/leitura';
import { arquivoEscolhido } from '@/lib/rascunhos';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ALVOS: Record<Alvo, { titulo: string; texto: string; manual: string; foto: string; pdf: string | null }> = {
  dieta: { titulo: 'Importar dieta', texto: 'Envie a dieta do nutricionista. Você revisa tudo antes de salvar.', manual: '/dieta/editar', foto: 'Dieta impressa ou escrita à mão', pdf: 'Arquivo enviado pelo nutricionista' },
  treino: { titulo: 'Importar ficha', texto: 'Envie a ficha da academia. Você revisa tudo antes de salvar.', manual: '/treino/plano', foto: 'Ficha impressa ou escrita à mão', pdf: 'Ficha recebida em PDF' },
  bio: { titulo: 'Importar laudo', texto: 'Envie o laudo da bioimpedância. Você revisa tudo antes de salvar.', manual: '/perfil/bioimpedancia', foto: 'Laudo impresso', pdf: 'Laudo em PDF' },
  rotulo: { titulo: 'Tabela nutricional', texto: 'Fotografe a tabela da embalagem. Você confere os valores antes de salvar.', manual: '/dieta/novo-alimento', foto: 'Tabela inteira, com boa luz', pdf: null },
};

/** Origem da importação (painel por cima da tela atual). Vale para dieta, ficha de treino, laudo e rótulo. */
export default function OrigemImportacao() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { alvo = 'dieta', codigo } = useLocalSearchParams<{ alvo?: Alvo; codigo?: string }>();
  const params = codigo ? { codigo } : undefined;
  const a = ALVOS[alvo] ?? ALVOS.dieta;
  const [erro, setErro] = useState('');

  const opcoes: [Origem, LucideIcon, string, string][] = [
    ['camera', Camera, 'Tirar foto', a.foto],
    ['galeria', ImageIcon, 'Escolher da galeria', 'Foto ou print já salvo'],
    ...(a.pdf ? ([['pdf', FileText, 'Escolher PDF', a.pdf]] as [Origem, LucideIcon, string, string][]) : []),
  ];

  const escolher = async (origem: Origem) => {
    setErro('');
    try {
      const arquivo = await escolherArquivo(origem);
      if (!arquivo) return;
      arquivoEscolhido.definir({ alvo, arquivo, params });
      router.replace('/dieta/lendo');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir o arquivo.');
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.xl) + space.md }]}>
        <View style={[styles.handle, { backgroundColor: colors.track }]} />
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>{a.titulo}</AppText>
        <AppText color="textMuted">{a.texto}</AppText>
        {opcoes.map(([origem, Icon, t, s]) => (
          <Pressable key={origem} onPress={() => escolher(origem)} style={({ pressed }) => [styles.option, { backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 }]}>
            <IconTile icon={Icon} tone={alvo === "treino" ? "training" : "diet"} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="itemTitle">{t}</AppText>
              <AppText variant="caption" color="textMuted">
                {s}
              </AppText>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        ))}
        {erro ? (
          <AppText variant="bodySmall" color="dietStrong">
            {erro}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Sparkles size={16} color={colors.textMuted} />
          <AppText variant="caption" color="textMuted" style={{ flex: 1 }}>
            Com internet, a leitura é feita por IA. Sem internet, o celular lê fotos de texto impresso.
          </AppText>
        </View>
        <Button variant="secondary" label="Cadastrar manualmente" onPress={() => router.replace({ pathname: a.manual, params } as never)} />
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
