import { router } from 'expo-router';
import { Check, FileSearch } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Card, IconTile, Screen, TopBar } from '@/components/ui';
import { configLeitura, lerArquivo, PROVEDORES, type Alvo, type Leitura } from '@/lib/leitura';
import { aplicarBio, aplicarDieta, aplicarRotulo, aplicarTreino } from '@/lib/leitura/aplicar';
import { arquivoEscolhido } from '@/lib/rascunhos';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TEXTOS: Record<Alvo, { titulo: string; lendo: string; dicas: string[]; destino: string }> = {
  treino: { titulo: 'Importar ficha', lendo: 'Lendo sua ficha…', destino: '/treino/plano', dicas: ['Os exercícios são associados ao catálogo do app', 'O que não reconhecermos vira exercício novo, marcado para revisão', 'Nada é salvo sem a sua confirmação'] },
  dieta: { titulo: 'Importar dieta', lendo: 'Lendo sua dieta…', destino: '/dieta/editar', dicas: ['Os alimentos são buscados na TACO e nos seus alimentos', 'Itens que não reconhecermos ficam listados para você adicionar', 'Nada é salvo sem a sua confirmação'] },
  bio: { titulo: 'Importar laudo', lendo: 'Lendo seu laudo…', destino: '/perfil/bioimpedancia', dicas: ['Os valores preenchem o formulário do exame', 'Confira cada medida antes de salvar', 'Nada é salvo sem a sua confirmação'] },
  rotulo: { titulo: 'Tabela nutricional', lendo: 'Lendo a tabela…', destino: '/dieta/novo-alimento', dicas: ['Os valores por porção preenchem o cadastro', 'Confira nome, porção e valores', 'Nada é salvo sem a sua confirmação'] },
};

/** Lê o arquivo escolhido (IA com internet, aparelho sem internet) e segue para a revisão. */
export default function LendoArquivo() {
  const { colors } = useTheme();
  const [escolha] = useState(() => arquivoEscolhido.ler());
  const alvo = escolha?.alvo ?? 'dieta';
  const t = TEXTOS[alvo];
  const cfg = configLeitura();

  useEffect(() => {
    if (!escolha) {
      router.back();
      return;
    }
    let vivo = true;
    lerArquivo(escolha.alvo, escolha.arquivo)
      .then((l) => {
        if (!vivo) return;
        arquivoEscolhido.definir(null);
        if (l.alvo === 'treino') aplicarTreino(l as Leitura<'treino'>);
        else if (l.alvo === 'dieta') aplicarDieta(l as Leitura<'dieta'>);
        else if (l.alvo === 'bio') aplicarBio(l as Leitura<'bio'>);
        else aplicarRotulo(l as Leitura<'rotulo'>);
        router.replace({ pathname: t.destino, params: escolha.params } as never);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        router.replace({ pathname: '/dieta/erro', params: { alvo, msg: e instanceof Error ? e.message : String(e), ...escolha.params } });
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen header={<TopBar title={t.titulo} />}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
        <IconTile icon={FileSearch} tone="diet" size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 22 }}>{t.lendo}</AppText>
        <AppText color="textMuted">{escolha?.arquivo.nome}</AppText>
        <ActivityIndicator color={colors.diet} />
        <AppText variant="bodySmall" color="textMuted" style={{ textAlign: 'center' }}>
          {cfg.modo === 'aparelho' ? 'Lendo no aparelho, sem internet' : `Lendo com ${PROVEDORES[cfg.provedor]}; sem internet, o celular lê sozinho`}
        </AppText>
      </View>
      <Card gap={space.md}>
        {t.dicas.map((d) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Check size={16} color={colors.accent} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {d}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
