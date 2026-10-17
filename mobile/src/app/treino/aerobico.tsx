import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Clock, Flame, Link, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, BottomActionBar, Button, Card, ChipGroup, ConfirmDialog, FieldLabel, FieldRow, Screen, SegmentedControl, TextField, Toggle, TopBar } from '@/components/ui';
import { agoraIso, db, hojeIso, useConsulta } from '@/db/conexao';
import { AEROBICOS, aerobico, estimarAerobico, excluirAerobico, registrarAerobico, sessaoCompleta, type Sessao } from '@/db/treino';
import type { Escala, TipoAerobico } from '@/lib/calculos';
import { campo, campoData, horaValida, lerDataBr, lerNumero, mascaraData, mascaraHora, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TIPOS = Object.entries(AEROBICOS) as [TipoAerobico, string][];
const ESCALAS: [Escala, string][] = [
  ['leve', 'Leve'],
  ['moderada', 'Moderada'],
  ['intensa', 'Intensa'],
];
const MODOS = ['Escala', 'Esforço 1–10', 'Freq. cardíaca'];

/** Registrar ou editar aeróbico (RF24–RF26, RF46). Pode ficar ligado ao treino do dia ou ser avulso. */
export default function RegistrarAerobico() {
  const { colors } = useTheme();
  const p = useLocalSearchParams<{ id?: string; sessao?: string; tipo?: TipoAerobico; duracao?: string }>();
  const existente = p.id ? aerobico(p.id) : null;
  const [tipo, setTipo] = useState<TipoAerobico>(existente?.tipo ?? p.tipo ?? 'esteira');
  const ini = existente ? new Date(existente.inicio) : new Date();
  const [data, setData] = useState(campoData(existente?.inicio.slice(0, 10) ?? hojeIso()));
  const [hora, setHora] = useState(agoraIso(ini).slice(11, 16));
  const [dur, setDur] = useState(campo(existente?.duracao_min) || p.duracao || '');
  const [dist, setDist] = useState(campo(existente?.distancia_km));
  const [incl, setIncl] = useState(campo(existente?.inclinacao_pct));
  const [nivel, setNivel] = useState(campo(existente?.nivel_carga));
  const [modo, setModo] = useState(existente?.intensidade_pse ? MODOS[1] : existente?.fc_media_bpm ? MODOS[2] : MODOS[0]);
  const [escala, setEscala] = useState<Escala>(existente?.intensidade_escala ?? 'moderada');
  const [pse, setPse] = useState(campo(existente?.intensidade_pse));
  const [fc, setFc] = useState(campo(existente?.fc_media_bpm));
  const [tentou, setTentou] = useState(false);
  const [apagar, setApagar] = useState(false);

  // Treino do mesmo dia para vincular (o aberto ou o último concluído hoje).
  const dataIso = lerDataBr(data);
  const doDia = useConsulta(() => {
    if (p.sessao) return sessaoCompleta(p.sessao);
    const s = db().get<Sessao>(
      "SELECT * FROM sessao_treino WHERE excluido_em IS NULL AND substr(inicio,1,10) = ? AND status IN ('em_andamento','pausada','concluida','parcial') ORDER BY inicio DESC LIMIT 1",
      [dataIso ?? ''],
    );
    return s ? sessaoCompleta(s.id) : null;
  }, [p.sessao, dataIso]);
  const [vincular, setVincular] = useState(existente ? !!existente.sessao_treino_id : true);

  const duracao = lerNumero(dur);
  const distancia = lerNumero(dist);
  const entrada = {
    tipo,
    duracao_min: duracao ?? 0,
    intensidade_escala: modo === MODOS[0] ? escala : null,
    intensidade_pse: modo === MODOS[1] ? lerNumero(pse) : null,
    fc_media_bpm: modo === MODOS[2] ? lerNumero(fc) : null,
  };
  const est = duracao ? estimarAerobico(entrada) : null;
  const erros = {
    data: !dataIso || dataIso > hojeIso(),
    hora: !horaValida(hora),
    dur: !duracao || duracao <= 0 || duracao > 600,
    pse: modo === MODOS[1] && !(Number(pse) >= 1 && Number(pse) <= 10),
    fc: modo === MODOS[2] && !(Number(fc) >= 40 && Number(fc) <= 230),
  };

  const salvar = () => {
    setTentou(true);
    if (Object.values(erros).some(Boolean)) return;
    const [hh, mm] = hora.split(':').map(Number);
    const [a, m, dd] = dataIso!.split('-').map(Number);
    registrarAerobico(
      {
        ...entrada,
        inicio: agoraIso(new Date(a, m - 1, dd, hh, mm)),
        distancia_km: distancia,
        inclinacao_pct: tipo === 'esteira' ? lerNumero(incl) : null,
        nivel_carga: tipo === 'bicicleta' || tipo === 'eliptico' ? lerNumero(nivel) : null,
        sessao_treino_id: vincular && doDia ? doDia.id : null,
      },
      existente?.id,
    );
    router.back();
  };

  return (
    <>
      <Screen
        header={<TopBar title={existente ? 'Aeróbico' : 'Registrar aeróbico'} />}
        footer={<BottomActionBar primary={{ label: existente ? 'Salvar alterações' : 'Salvar aeróbico', onPress: salvar }} />}>
        <FieldLabel>Tipo</FieldLabel>
        <ChipGroup options={TIPOS.map(([, l]) => l)} selected={AEROBICOS[tipo]} onChange={(l) => setTipo(TIPOS.find(([, x]) => x === l)![0])} />
        <FieldRow>
          <TextField label="Data" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" trailing={<Calendar size={18} color={colors.textMuted} />} warning={tentou && erros.data} />
          <TextField label="Início" value={hora} onChangeText={(t) => setHora(mascaraHora(t))} keyboardType="number-pad" trailing={<Clock size={18} color={colors.textMuted} />} warning={tentou && erros.hora} />
        </FieldRow>
        <FieldRow>
          <TextField label="Duração" value={dur} onChangeText={setDur} placeholder="30" unit="min" keyboardType="number-pad" warning={tentou && erros.dur} />
          <TextField label="Distância" value={dist} onChangeText={setDist} placeholder="opcional" unit="km" keyboardType="decimal-pad" />
        </FieldRow>
        {tipo === 'esteira' ? (
          <FieldRow>
            <TextField label="Inclinação" value={incl} onChangeText={setIncl} placeholder="0" unit="%" keyboardType="decimal-pad" />
            <TextField label="Velocidade média" value={duracao && distancia ? num(distancia / (duracao / 60)) : ''} placeholder="—" unit="km/h" readonly />
          </FieldRow>
        ) : tipo === 'bicicleta' || tipo === 'eliptico' ? (
          <TextField label="Carga ou nível" value={nivel} onChangeText={setNivel} placeholder="opcional" keyboardType="number-pad" />
        ) : null}
        <FieldLabel>Intensidade</FieldLabel>
        <SegmentedControl options={MODOS} selected={modo} onChange={setModo} />
        {modo === MODOS[0] ? (
          <ChipGroup options={ESCALAS.map(([, l]) => l)} selected={ESCALAS.find(([e]) => e === escala)![1]} onChange={(l) => setEscala(ESCALAS.find(([, x]) => x === l)![0])} />
        ) : modo === MODOS[1] ? (
          <TextField value={pse} onChangeText={setPse} placeholder="6" unit="de 10" keyboardType="number-pad" warning={tentou && erros.pse} />
        ) : (
          <TextField value={fc} onChangeText={setFc} placeholder="140" unit="bpm médio" keyboardType="number-pad" warning={tentou && erros.fc} />
        )}
        {doDia && !p.sessao ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Link size={20} color={colors.textMuted} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Incluir no treino do dia</AppText>
                <AppText variant="caption" color="textMuted">
                  {doDia.letra ? `${doDia.titulo} · ${doDia.subtitulo}` : doDia.titulo}
                </AppText>
              </View>
              <Toggle value={vincular} onChange={setVincular} />
            </View>
          </Card>
        ) : null}
        {est ? <Banner icon={Flame} message={`Gasto estimado: ${num(est.kcal, 0)} kcal (MET ${num(est.met)} · Compendium of Physical Activities).`} /> : null}
        {existente ? <Button variant="danger" icon={Trash2} label="Excluir aeróbico" onPress={() => setApagar(true)} /> : null}
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Excluir este aeróbico?"
        message="Ele sai do histórico e do gasto do dia. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          if (existente) excluirAerobico(existente.id);
          router.back();
        }}
      />
    </>
  );
}
