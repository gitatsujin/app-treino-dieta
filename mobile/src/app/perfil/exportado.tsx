import { router } from 'expo-router';
import { Check, FileSpreadsheet, FileText, Share } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, BottomActionBar, Card, Divider, IconTile, Screen, TopBar } from '@/components/ui';
import { compartilhar, ultimaExportacao } from '@/lib/exportacao';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const tamanho = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

/** Exportação pronta: cada arquivo abre a tela de compartilhar do celular (expo-sharing). */
export default function ExportacaoPronta() {
  const { colors } = useTheme();
  const arquivos = ultimaExportacao.useValor();
  const [aviso, setAviso] = useState('');
  const perfil = () => router.dismissTo('/perfil');
  const enviar = async (i: number) => {
    const ok = await compartilhar(arquivos[i]);
    if (!ok) setAviso('O compartilhamento não está disponível neste aparelho.');
  };
  return (
    <Screen
      header={<TopBar title="Exportar dados" leading="close" onLeadingPress={perfil} />}
      footer={
        arquivos.length === 1 ? (
          <BottomActionBar secondary={{ label: 'Fechar', onPress: perfil }} primary={{ label: 'Compartilhar arquivo', onPress: () => enviar(0) }} />
        ) : (
          <BottomActionBar primary={{ label: 'Concluir', onPress: perfil }} />
        )
      }>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xxl, paddingBottom: space.sm }}>
        <IconTile icon={Check} size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 22 }}>{arquivos.length === 1 ? 'Arquivo pronto' : `${arquivos.length} arquivos prontos`}</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          Escolha onde salvar ou com quem compartilhar. Nenhum arquivo é enviado para servidores do app.
        </AppText>
      </View>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {arquivos.map((a, i) => (
          <View key={a.nome}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => enviar(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md }}>
              <IconTile icon={a.nome.endsWith('.json') ? FileText : FileSpreadsheet} tone="neutral" size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>{a.nome}</AppText>
                <AppText variant="caption" color="textMuted">
                  {a.linhas.toLocaleString('pt-BR')} registro{a.linhas === 1 ? '' : 's'} · {tamanho(a.bytes)}
                </AppText>
              </View>
              <Share size={18} color={colors.accent} />
            </Pressable>
          </View>
        ))}
      </Card>
      {aviso ? (
        <AppText variant="bodySmall" color="dietStrong">
          {aviso}
        </AppText>
      ) : null}
    </Screen>
  );
}
