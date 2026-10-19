import { router, useLocalSearchParams } from 'expo-router';
import { FileWarning, Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, ButtonRow, Card, IconTile, Screen, TopBar } from '@/components/ui';
import type { Alvo } from '@/lib/leitura';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MANUAL: Record<Alvo, string> = { dieta: '/dieta/editar', treino: '/treino/plano', bio: '/perfil/bioimpedancia', rotulo: '/dieta/novo-alimento' };
const TITULO: Record<Alvo, string> = { dieta: 'Importar dieta', treino: 'Importar ficha', bio: 'Importar laudo', rotulo: 'Tabela nutricional' };

/** Erro na leitura do arquivo importado. */
export default function ErroLeitura() {
  const { colors } = useTheme();
  const { alvo = 'dieta', msg, codigo } = useLocalSearchParams<{ alvo?: Alvo; msg?: string; codigo?: string }>();
  const params = codigo ? { codigo } : undefined;
  return (
    <Screen header={<TopBar title={TITULO[alvo] ?? 'Importar'} />}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
        <IconTile icon={FileWarning} tone="neutral" size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>Não conseguimos ler o arquivo</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          {msg || 'A foto pode estar desfocada ou o texto pequeno demais para reconhecer.'}
        </AppText>
      </View>
      <Card gap={space.md}>
        <AppText variant="itemTitle">Para uma leitura melhor</AppText>
        {['Fotografe em um lugar bem iluminado', 'Enquadre só a folha, sem cortar as bordas', 'Se tiver o PDF original, prefira enviá-lo (precisa de internet)'].map((d) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Lightbulb size={16} color={colors.dietStrong} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {d}
            </AppText>
          </View>
        ))}
      </Card>
      <ButtonRow
        secondary={{ label: 'Tentar de novo', onPress: () => router.replace({ pathname: '/dieta/origem', params: { alvo, ...params } }) }}
        primary={{ label: 'Cadastrar manualmente', onPress: () => router.replace({ pathname: MANUAL[alvo] ?? '/dieta/editar', params } as never) }}
      />
    </Screen>
  );
}
