import { router } from 'expo-router';
import { Database, Trash2 } from 'lucide-react-native';
import { useState } from 'react';

import { AppText, Button, Card, ConfirmDialog, IconTile, Screen, TopBar } from '@/components/ui';
import { carregarExemplo } from '@/db/exemplo';
import { apagarTodosOsDados } from '@/db/perfil';

/** Ferramenta de desenvolvimento: preenche o app com três semanas de histórico, ou apaga tudo. */
export default function DadosDeExemplo() {
  const [feito, setFeito] = useState(false);
  const [apagar, setApagar] = useState(false);
  return (
    <>
      <Screen header={<TopBar title="Dados de exemplo" />}>
        <Card>
          <IconTile icon={Database} />
          <AppText>
            Cria um plano ABC, uma dieta, três semanas de treinos com cargas subindo, aeróbicos, dez dias de refeições, pesagens, uma bioimpedância e quatro metas. Nada
            do que você já registrou é apagado.
          </AppText>
          <Button
            label={feito ? 'Dados carregados' : 'Carregar dados de exemplo'}
            disabled={feito}
            onPress={() => {
              carregarExemplo();
              setFeito(true);
            }}
          />
          {feito ? <Button variant="secondary" label="Ir para a Início" onPress={() => router.dismissTo('/')} /> : null}
        </Card>
        <Card>
          <AppText color="textMuted">Para recomeçar do zero (volta para o cadastro inicial):</AppText>
          <Button variant="danger" icon={Trash2} label="Apagar todos os dados" onPress={() => setApagar(true)} />
        </Card>
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Apagar todos os dados?"
        message="Perfil, treinos, dieta, medidas e metas deste aparelho serão apagados."
        confirmLabel="Apagar"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          apagarTodosOsDados();
          if (router.canDismiss()) router.dismissAll();
          router.replace('/entrada/boas-vindas');
        }}
      />
    </>
  );
}
