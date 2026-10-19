import { router } from 'expo-router';
import { Download, FileText, Lock, Smartphone, Trash2 } from 'lucide-react-native';
import { useState } from 'react';

import { AppText, Banner, Button, Card, ConfirmDialog, Divider, ListRow, Screen, Toggle, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useConsulta } from '@/db/conexao';
import { apagarTodosOsDados, definirCicloAtivo, definirPref, usuario } from '@/db/perfil';
import { useTheme } from '@/theme/use-theme';

/** Privacidade e dados (LGPD, RNF): permissões, exportação, política e exclusão total. */
export default function Privacidade() {
  const { colors } = useTheme();
  const u = useConsulta(() => usuario());
  const [confirmar, setConfirmar] = useState(false);
  return (
    <>
      <Screen header={<TopBar title="Privacidade e dados" />}>
        <Banner icon={Smartphone} tone="training" message="Seus dados ficam guardados só neste aparelho. Só as fotos e PDFs que você importar com internet são enviados, para leitura pela IA." />
        <Card gap={0}>
          <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
            O que o app pode usar
          </AppText>
          <Divider />
          <ListRow title="Dados de saúde" subtitle="Necessário para o app funcionar" trailing={<Lock size={18} color={colors.textMuted} />} />
          <Divider />
          <ListRow title="Fotos e PDFs importados" subtitle="Usados só para ler fichas, dietas e laudos" trailing={<Lock size={18} color={colors.textMuted} />} />
          {u?.sexo === 'feminino' ? (
            <>
              <Divider />
              <ListRow
                title="Ciclo menstrual"
                subtitle="Opcional · visível só para você"
                trailing={
                  <Toggle
                    value={!!u.ciclo_ativo}
                    onChange={(v) => {
                      definirCicloAtivo(v);
                      definirPref('consentimento_ciclo', v ? '1' : '0');
                    }}
                  />
                }
              />
            </>
          ) : null}
        </Card>
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          <ListRow leading={<Download size={20} color={colors.textMuted} />} title="Exportar meus dados" subtitle="Arquivo com todo o seu histórico" chevron onPress={() => router.push('/perfil/exportar')} />
          <Divider />
          <ListRow leading={<FileText size={20} color={colors.textMuted} />} title="Política de privacidade" subtitle="Como seus dados são tratados (LGPD)" chevron onPress={() => router.push('/perfil/politica')} />
        </Card>
        <Card gap={space.md}>
          <AppText style={{ fontFamily: font.semibold, fontSize: 15, color: colors.statusFar }}>Excluir todos os dados</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Apaga treinos, dieta, medidas, metas e o perfil deste aparelho. Essa ação não pode ser desfeita.
          </AppText>
          <Button variant="danger" icon={Trash2} label="Excluir meus dados" onPress={() => setConfirmar(true)} />
        </Card>
      </Screen>
      <ConfirmDialog
        visible={confirmar}
        icon={Trash2}
        title="Excluir todos os dados?"
        message="Treinos, dieta, medidas, metas e o perfil serão apagados deste aparelho. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setConfirmar(false)}
        onConfirm={() => {
          setConfirmar(false);
          apagarTodosOsDados();
          if (router.canDismiss()) router.dismissAll();
          router.replace('/entrada/boas-vindas');
        }}
      />
    </>
  );
}
