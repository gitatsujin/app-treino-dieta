import { Bell, BellOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { AppText, Banner, Button, Card, ChipGroup, Divider, ListRow, Screen, SectionHeader, TextField, Toggle, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { dataCurta, horaValida, mascaraHora } from '@/lib/formato';
import { configNotificacoes, estadoAtual, pedirPermissao, planejar, reagendar, salvarConfigNotificacoes, statusPermissao, type Agendada, type ConfigNotificacoes, type StatusPermissao } from '@/lib/notificacoes';
import { space } from '@/theme/tokens';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SEMANA = ['Todo domingo', 'Toda segunda', 'Toda terça', 'Toda quarta', 'Toda quinta', 'Toda sexta', 'Todo sábado'];

function quando(a: Agendada) {
  const p = (n: number) => String(n).padStart(2, '0');
  const g = a.gatilho;
  if (g.tipo === 'diario') return `Todo dia às ${p(g.hora)}:${p(g.minuto)}`;
  if (g.tipo === 'semanal') return `${SEMANA[g.diaSemana - 1]} às ${p(g.hora)}:${p(g.minuto)}`;
  const d = g.quando;
  return `${dataCurta(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Perfil › Notificações (RF56–RF63): ligar e desligar cada lembrete e ajustar horários. */
export default function Notificacoes() {
  const salva = useConsulta(() => configNotificacoes());
  const [c, setC] = useState<ConfigNotificacoes>(salva);
  const [horaTreino, setHoraTreino] = useState(salva.treino.hora);
  const [horaLembretes, setHoraLembretes] = useState(salva.horaLembretes);
  const [perm, setPerm] = useState<StatusPermissao | null>(null);
  const plano = useConsulta(() => planejar(estadoAtual()));
  const ctx = useConsulta(() => {
    const e = estadoAtual();
    return { comHorario: e.refeicoes.filter((r) => r.horario).length, ciclo: e.cicloAtivo, temPeso: !!e.ultimoPeso, temBio: !!e.ultimaBio };
  });

  useEffect(() => {
    const ver = () => statusPermissao().then(setPerm);
    ver();
    // Volta dos Ajustes do iPhone: confere de novo.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && ver());
    return () => sub.remove();
  }, []);

  const mudar = (n: ConfigNotificacoes) => {
    setC(n);
    salvarConfigNotificacoes(n);
    reagendar().catch(() => {});
  };
  const ligar = <K extends keyof ConfigNotificacoes>(k: K, v: Partial<ConfigNotificacoes[K]>) => mudar({ ...c, [k]: { ...(c[k] as object), ...v } });

  const linha = (titulo: string, sub: string, valor: boolean, onChange: (v: boolean) => void) => <ListRow title={titulo} subtitle={sub} trailing={<Toggle value={valor} onChange={onChange} />} />;

  return (
    <Screen header={<TopBar title="Notificações" />}>
      {perm === 'pendente' ? (
        <Card>
          <AppText variant="itemTitle">Permita as notificações</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Sem a permissão do iPhone, o app não consegue lembrar você dos treinos, refeições e pesagens.
          </AppText>
          <Button icon={Bell} label="Permitir notificações" onPress={() => pedirPermissao().then(setPerm)} />
        </Card>
      ) : perm === 'negada' ? (
        <Card>
          <AppText variant="itemTitle">Notificações desligadas no iPhone</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Para receber os lembretes, ative em Ajustes › Notificações › Treino e Dieta.
          </AppText>
          <Button variant="secondary" icon={BellOff} label="Abrir Ajustes" onPress={() => Linking.openSettings()} />
        </Card>
      ) : perm === 'indisponivel' ? (
        <Banner icon={BellOff} tone="neutral" message="As notificações não estão disponíveis aqui (só no app instalado no celular)." />
      ) : null}

      <SectionHeader title="Treino" />
      <Card gap={space.md}>
        {linha('Lembrete de treino', c.treino.ativo ? `Nos dias marcados, às ${c.treino.hora}` : 'Desligado', c.treino.ativo, (v) => ligar('treino', { ativo: v }))}
        {c.treino.ativo ? (
          <>
            <ChipGroup
              options={DIAS}
              selected={c.treino.dias.map((d) => DIAS[d])}
              onChange={(o) => {
                const d = DIAS.indexOf(o);
                const dias = c.treino.dias.includes(d) ? c.treino.dias.filter((x) => x !== d) : [...c.treino.dias, d].sort();
                ligar('treino', { dias });
              }}
            />
            <TextField
              label="Horário"
              value={horaTreino}
              onChangeText={(t) => setHoraTreino(mascaraHora(t))}
              onBlur={() => (horaValida(horaTreino) ? ligar('treino', { hora: horaTreino }) : setHoraTreino(c.treino.hora))}
              keyboardType="number-pad"
              placeholder="18:00"
            />
          </>
        ) : null}
      </Card>

      <SectionHeader title="Dieta e metas" />
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {linha('Refeições', ctx.comHorario ? `Na hora de cada uma das ${ctx.comHorario} refeições da dieta` : 'Cadastre horários nas refeições da dieta', c.refeicoes.ativo, (v) => ligar('refeicoes', { ativo: v }))}
        <Divider />
        {linha('Calorias acima da meta', 'Quando passar da margem de 7%', c.calorias.ativo, (v) => ligar('calorias', { ativo: v }))}
        <Divider />
        {linha('Metas', 'Meta atingida e 3 dias antes do prazo', c.metas.ativo, (v) => ligar('metas', { ativo: v }))}
      </Card>

      <SectionHeader title="Medidas" />
      <Card gap={space.md}>
        {linha('Pesagem', ctx.temPeso ? `A cada ${c.peso.dias} dias` : 'Começa depois da primeira pesagem', c.peso.ativo, (v) => ligar('peso', { ativo: v }))}
        {c.peso.ativo ? <ChipGroup options={['7 dias', '15 dias', '30 dias']} selected={`${c.peso.dias} dias`} onChange={(o) => ligar('peso', { dias: parseInt(o, 10) })} /> : null}
        <Divider />
        {linha('Bioimpedância', ctx.temBio ? `A cada ${c.bio.meses} ${c.bio.meses === 1 ? 'mês' : 'meses'}` : 'Começa depois do primeiro exame', c.bio.ativo, (v) => ligar('bio', { ativo: v }))}
        {c.bio.ativo ? <ChipGroup options={['1 mês', '2 meses', '3 meses', '6 meses']} selected={`${c.bio.meses} ${c.bio.meses === 1 ? 'mês' : 'meses'}`} onChange={(o) => ligar('bio', { meses: parseInt(o, 10) })} /> : null}
        {ctx.ciclo ? (
          <>
            <Divider />
            {linha('Ciclo menstrual', `${c.ciclo.diasAntes} ${c.ciclo.diasAntes === 1 ? 'dia' : 'dias'} antes da menstruação prevista`, c.ciclo.ativo, (v) => ligar('ciclo', { ativo: v }))}
            {c.ciclo.ativo ? <ChipGroup options={['1 dia', '2 dias', '3 dias']} selected={`${c.ciclo.diasAntes} ${c.ciclo.diasAntes === 1 ? 'dia' : 'dias'}`} onChange={(o) => ligar('ciclo', { diasAntes: parseInt(o, 10) })} /> : null}
          </>
        ) : null}
        <TextField
          label="Horário desses lembretes"
          value={horaLembretes}
          onChangeText={(t) => setHoraLembretes(mascaraHora(t))}
          onBlur={() => (horaValida(horaLembretes) ? mudar({ ...c, horaLembretes }) : setHoraLembretes(c.horaLembretes))}
          keyboardType="number-pad"
          placeholder="09:00"
        />
      </Card>

      <SectionHeader title="Próximos lembretes" />
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {plano.length ? (
          plano.slice(0, 10).map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow title={a.titulo} subtitle={quando(a)} />
            </View>
          ))
        ) : (
          <ListRow title="Nenhum lembrete agendado" subtitle="Ligue algum lembrete acima" />
        )}
      </Card>
      <AppText variant="caption" color="textMuted">
        Os lembretes são criados no próprio celular e funcionam sem internet.
      </AppText>
    </Screen>
  );
}
