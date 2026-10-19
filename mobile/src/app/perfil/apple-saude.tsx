import { CircleAlert, Heart, RefreshCw, Settings, Unplug, Watch } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AppText, Button, Card, ConfirmDialog, Divider, IconTile, ListRow, Screen, Tag, TopBar } from '@/components/ui';
import { db, hojeIso, useConsulta } from '@/db/conexao';
import { usuario } from '@/db/perfil';
import { dataCurta, hora, kcal as fmtKcal, num } from '@/lib/formato';
import { adaptadorSaude, conectarSaude, desativarIntegracao, integracaoAtiva, NOME_SAUDE, saudeDisponivel, sincronizarSaude, type ResumoSincronizacao } from '@/lib/saude';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Apple Saúde / Health Connect (RF44, RF45, RF55): conectar, ver o que foi lido e sincronizar.
 * O gasto do dia passa a usar a energia ativa do relógio (RN11); sem integração, volta à estimativa (RF46).
 */
export default function AppleSaude() {
  const { colors } = useTheme();
  const ciclo = useConsulta(() => !!usuario()?.ciclo_ativo);
  const d = useConsulta(() => {
    const i = integracaoAtiva();
    const hoje = hojeIso();
    return {
      i,
      hoje: db().get<{ k: number }>('SELECT energia_ativa_kcal AS k FROM gasto_ativo_diario WHERE excluido_em IS NULL AND data = ?', [hoje])?.k ?? null,
      dias: db().get<{ n: number }>('SELECT COUNT(*) AS n FROM gasto_ativo_diario WHERE excluido_em IS NULL')?.n ?? 0,
      aerobicos: db().get<{ n: number }>("SELECT COUNT(*) AS n FROM sessao_aerobico WHERE excluido_em IS NULL AND origem <> 'manual'")?.n ?? 0,
      pesos: db().get<{ n: number }>("SELECT COUNT(*) AS n FROM registro_peso WHERE excluido_em IS NULL AND origem = 'integracao'")?.n ?? 0,
      ciclos: db().get<{ n: number }>("SELECT COUNT(*) AS n FROM ciclo_menstrual WHERE excluido_em IS NULL AND origem <> 'manual'")?.n ?? 0,
    };
  });
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState<'conectando' | 'sincronizando' | null>(null);
  const [erro, setErro] = useState('');
  const [ultimo, setUltimo] = useState<ResumoSincronizacao | null>(null);
  const [sair, setSair] = useState(false);

  useEffect(() => {
    saudeDisponivel().then(setDisponivel);
  }, []);

  const rodar = async (tipo: 'conectando' | 'sincronizando') => {
    setErro('');
    setOcupado(tipo);
    try {
      setUltimo(tipo === 'conectando' ? await conectarSaude() : await sincronizarSaude(true));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler os dados.');
    } finally {
      setOcupado(null);
    }
  };

  const conectado = !!d.i;
  const status = conectado ? 'Conectado' : disponivel === false ? 'Indisponível' : 'Não conectado';

  return (
    <>
      <Screen header={<TopBar title={NOME_SAUDE} subtitle="Integração" />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <IconTile icon={Heart} tone="diet" />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>{NOME_SAUDE}</AppText>
              <AppText variant="caption" color="textMuted">
                {conectado && d.i?.ultima_sincronizacao
                  ? `Lido ${d.i.ultima_sincronizacao.slice(0, 10) === hojeIso() ? 'hoje' : dataCurta(d.i.ultima_sincronizacao.slice(0, 10))} às ${hora(d.i.ultima_sincronizacao)}`
                  : conectado
                    ? 'Aguardando a primeira leitura'
                    : 'Treinos, energia e peso do seu relógio'}
              </AppText>
            </View>
            <Tag label={status} tone={conectado ? 'near' : 'neutral'} />
          </View>
          {ocupado ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <ActivityIndicator color={colors.accent} />
              <AppText variant="bodySmall">{ocupado === 'conectando' ? 'Conectando…' : 'Lendo os dados…'}</AppText>
            </View>
          ) : conectado ? (
            <Button variant="secondary" icon={RefreshCw} label="Sincronizar agora" onPress={() => rodar('sincronizando')} />
          ) : disponivel ? (
            <Button icon={Heart} label={`Conectar ao ${NOME_SAUDE}`} onPress={() => rodar('conectando')} />
          ) : null}
          {erro ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <CircleAlert size={16} color={colors.dietStrong} />
              <AppText variant="bodySmall" color="dietStrong" style={{ flex: 1 }}>
                {erro}
              </AppText>
            </View>
          ) : null}
          {ultimo ? (
            <AppText variant="caption" color="textMuted">
              Última leitura: {ultimo.dias} dia{ultimo.dias === 1 ? '' : 's'} de energia, {ultimo.aerobicosNovos} atividade{ultimo.aerobicosNovos === 1 ? '' : 's'} nova{ultimo.aerobicosNovos === 1 ? '' : 's'}
              {ultimo.sessoesComCalorias ? `, calorias do relógio em ${ultimo.sessoesComCalorias} treino${ultimo.sessoesComCalorias === 1 ? '' : 's'}` : ''}
              {ultimo.pesos ? `, ${ultimo.pesos} pesagem${ultimo.pesos === 1 ? '' : 'ns'}` : ''}
              {ultimo.ciclos ? `, ${ultimo.ciclos} ciclo${ultimo.ciclos === 1 ? '' : 's'}` : ''}.
            </AppText>
          ) : null}
        </Card>

        {disponivel === false && !conectado ? (
          <Card gap={space.sm}>
            <AppText variant="itemTitle">Por que está indisponível?</AppText>
            <AppText variant="bodySmall" color="textMuted">
              {Platform.OS === 'android'
                ? 'O Health Connect precisa estar instalado e atualizado (Play Store). Ele também só funciona no app instalado, não no Expo Go.'
                : 'A integração só funciona no app instalado no iPhone, não no Expo Go nem no simulador sem o app Saúde.'}
            </AppText>
          </Card>
        ) : null}

        <Card gap={0}>
          <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
            {conectado ? 'O que já veio do relógio' : 'Quando conectar, o app vai ler'}
          </AppText>
          {(
            [
              ['Energia ativa', conectado ? (d.hoje != null ? `Hoje: ${fmtKcal(d.hoje)} · ${d.dias} dias` : `${d.dias} dias`) : 'O gasto do dia passa a usar o relógio'],
              ['Treinos e atividades', conectado ? `${num(d.aerobicos, 0)} atividades importadas` : 'Corridas, caminhadas, bike; calorias da musculação'],
              ['Peso', conectado ? `${num(d.pesos, 0)} pesagens` : 'De balanças que gravam no app de saúde'],
              ...(ciclo ? [['Ciclo menstrual', conectado ? `${num(d.ciclos, 0)} menstruações` : 'Os dias de menstruação registrados lá']] : []),
            ] as [string, string][]
          ).map(([t, s]) => (
            <View key={t}>
              <Divider />
              <ListRow title={t} subtitle={s} />
            </View>
          ))}
        </Card>

        <Card gap={space.sm}>
          <ListRow leading={<IconTile icon={Watch} tone="neutral" size={36} />} title="Relógios" subtitle="Apple Watch, Galaxy Watch, Garmin e outros que gravam no app de saúde" style={{ paddingVertical: 0 }} />
          <AppText variant="caption" color="textMuted">
            Com o relógio, o gasto do dia usa a energia ativa medida (que já inclui os treinos). Se uma atividade do relógio coincidir com uma que você registrou, o app pergunta qual vale. Nada é enviado para fora do celular.
          </AppText>
        </Card>

        {conectado && adaptadorSaude ? (
          <>
            <Button variant="secondary" icon={Settings} label={Platform.OS === 'android' ? 'Permissões no Health Connect' : 'Abrir o app Saúde'} onPress={() => adaptadorSaude?.abrirAjustes()} />
            {Platform.OS === 'ios' ? (
              <AppText variant="caption" color="textMuted">
                Para mudar o que o app pode ler: app Saúde › seu perfil › Apps › Treino e Dieta.
              </AppText>
            ) : null}
            <Button variant="danger" icon={Unplug} label="Desconectar" onPress={() => setSair(true)} />
          </>
        ) : null}
      </Screen>
      <ConfirmDialog
        visible={sair}
        icon={Unplug}
        title={`Desconectar do ${NOME_SAUDE}?`}
        message="As atividades e pesagens já importadas continuam no app. O gasto do dia volta a ser estimado pelo app."
        confirmLabel="Desconectar"
        onCancel={() => setSair(false)}
        onConfirm={() => {
          setSair(false);
          desativarIntegracao();
          setUltimo(null);
        }}
      />
    </>
  );
}
