import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Camera, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText, BottomActionBar, Button, Card, ConfirmDialog, Divider, FieldRow, ListRow, Screen, SectionHeader, Shortcut, Tag, TextField, TopBar } from '@/components/ui';
import { concluirImportacao } from '@/lib/leitura';
import { bioLida } from '@/lib/rascunhos';
import { hojeIso, useConsulta } from '@/db/conexao';
import { bios, excluirBio, pesoAtual, salvarBio, usuario } from '@/db/perfil';
import { classeImc, imc } from '@/lib/calculos';
import { campo, campoData, dataCompleta, lerDataBr, lerNumero, mascaraData, num } from '@/lib/formato';
import { useTheme } from '@/theme/use-theme';
import { space } from '@/theme/tokens';

/** Registrar ou editar bioimpedância (RF41, RF47–RF50). IMC é calculado (RF48); o peso também vira uma pesagem. */
export default function RegistrarBioimpedancia() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lista = useConsulta(() => bios());
  const ex = id ? lista.find((b) => b.id === id) : undefined;
  const u = usuario();
  // Laudo lido por foto/PDF: preenche o formulário uma vez; o usuário confere antes de salvar (RN01).
  const [lida] = useState(() => {
    const l = id ? null : bioLida.ler();
    bioLida.definir(null);
    return l;
  });
  const salvoRef = useRef(false);
  useEffect(
    () => () => {
      if (lida && !salvoRef.current) concluirImportacao(lida.importacaoId, false);
    },
    [lida],
  );
  const L = lida?.dados;
  const dataLida = L?.data && L.data <= hojeIso() ? L.data : null;
  const [data, setData] = useState(campoData(ex?.data ?? dataLida ?? hojeIso()));
  const [f, setF] = useState<Record<string, string>>({
    peso: campo(ex?.peso_kg ?? L?.peso_kg ?? pesoAtual()?.peso_kg),
    cintura: campo(ex?.cintura_cm ?? L?.cintura_cm),
    gordura: campo(ex?.gordura_pct ?? L?.gordura_pct),
    musculo: campo(ex?.musculo_esqueletico_pct ?? L?.musculo_esqueletico_pct),
    visceral: campo(ex?.gordura_visceral_nivel ?? L?.gordura_visceral_nivel),
    idadeBio: campo(ex?.idade_biologica ?? L?.idade_biologica),
    tmb: campo(ex?.metabolismo_repouso_kcal ?? L?.metabolismo_repouso_kcal),
  });
  const [tentou, setTentou] = useState(false);
  const [apagar, setApagar] = useState(false);
  const set = (k: string) => (t: string) => setF((x) => ({ ...x, [k]: t }));
  const n = (k: string) => lerNumero(f[k]);

  const dataIso = lerDataBr(data);
  const peso = n('peso');
  const faixa = (k: string, a: number, b: number) => !!f[k] && !(n(k)! >= a && n(k)! <= b);
  const erros = {
    data: !dataIso || dataIso > hojeIso(),
    peso: !peso || peso < 25 || peso > 350,
    gordura: faixa('gordura', 1, 80),
    musculo: faixa('musculo', 5, 80),
    visceral: faixa('visceral', 1, 30),
    tmb: faixa('tmb', 500, 5000),
    cintura: faixa('cintura', 30, 250),
    idadeBio: faixa('idadeBio', 5, 120),
  };
  const valorImc = peso && u ? imc(peso, u.altura_cm) : null;

  const salvar = () => {
    setTentou(true);
    if (Object.values(erros).some(Boolean)) return;
    const int = (k: string) => (n(k) == null ? null : Math.round(n(k)!));
    salvarBio(
      {
        data: dataIso!,
        peso_kg: peso!,
        cintura_cm: n('cintura'),
        gordura_pct: n('gordura'),
        musculo_esqueletico_pct: n('musculo'),
        metabolismo_repouso_kcal: int('tmb'),
        idade_biologica: int('idadeBio'),
        gordura_visceral_nivel: int('visceral'),
        ...(lida ? { importacao_id: lida.importacaoId } : {}),
      },
      ex?.id,
    );
    if (lida) {
      salvoRef.current = true;
      concluirImportacao(lida.importacaoId, true);
    }
    router.back();
  };

  const campoNum = (k: string, label: string, unit: string, kb: 'decimal-pad' | 'number-pad' = 'decimal-pad') => (
    <TextField label={label} value={f[k]} onChangeText={set(k)} unit={unit} keyboardType={kb} placeholder="—" warning={tentou && erros[k as keyof typeof erros]} />
  );

  return (
    <>
      <Screen header={<TopBar title={ex ? 'Bioimpedância' : 'Nova bioimpedância'} />} footer={<BottomActionBar primary={{ label: 'Salvar exame', onPress: salvar }} />}>
        {lida ? (
          <Card>
            <AppText variant="itemTitle">Laudo lido {lida.via === 'ia' ? 'com IA' : 'no aparelho'}</AppText>
            <AppText variant="bodySmall" color="textMuted">
              Confira cada valor com o laudo antes de salvar. Campos vazios não foram encontrados.
            </AppText>
          </Card>
        ) : !ex ? (
          <>
            <Shortcut icon={Camera} label="Foto ou PDF do laudo" onPress={() => router.replace({ pathname: '/dieta/origem', params: { alvo: 'bio' } })} />
            <AppText variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
              ou preencha os campos do exame
            </AppText>
          </>
        ) : null}
        <TextField label="Data do exame" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" trailing={<Calendar size={18} color={colors.textMuted} />} warning={tentou && erros.data} />
        <FieldRow>
          {campoNum('peso', 'Peso', 'kg')}
          {campoNum('cintura', 'Cintura', 'cm')}
        </FieldRow>
        <FieldRow>
          {campoNum('gordura', 'Gordura corporal', '%')}
          {campoNum('musculo', 'Músculo esquelético', '%')}
        </FieldRow>
        <FieldRow>
          {campoNum('visceral', 'Gordura visceral', 'nível', 'number-pad')}
          {campoNum('idadeBio', 'Idade biológica', 'anos', 'number-pad')}
        </FieldRow>
        {campoNum('tmb', 'Metabolismo em repouso', 'kcal', 'number-pad')}
        {valorImc ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color="textMuted">
                  IMC (calculado)
                </AppText>
                <AppText variant="value">{num(valorImc)}</AppText>
              </View>
              <Tag label={classeImc(valorImc)} tone={classeImc(valorImc) === 'Normal' ? 'near' : 'mid'} />
            </View>
          </Card>
        ) : null}
        <AppText variant="caption" color="textMuted">
          Preencha o que o seu laudo mostrar; só a data e o peso são obrigatórios. O metabolismo em repouso passa a ser a sua TMB.
        </AppText>
        {ex ? <Button variant="danger" icon={Trash2} label="Excluir exame" onPress={() => setApagar(true)} /> : null}
        {!ex && lista.length ? (
          <>
            <SectionHeader title="Exames anteriores" actionLabel="Ver evolução" onAction={() => router.push('/perfil/evolucao-bio')} />
            <Card gap={0} style={{ paddingVertical: space.xs }}>
              {lista.slice(0, 5).map((b, i) => (
                <View key={b.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={dataCompleta(b.data)}
                    subtitle={[b.gordura_pct != null ? `Gordura ${num(b.gordura_pct)}%` : '', b.musculo_esqueletico_pct != null ? `Músculo ${num(b.musculo_esqueletico_pct)}%` : '', `${num(b.peso_kg)} kg`].filter(Boolean).join(' · ')}
                    chevron
                    onPress={() => router.push({ pathname: '/perfil/bioimpedancia', params: { id: b.id } })}
                  />
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Excluir este exame?"
        message="O exame e a pesagem criada por ele saem do histórico. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          if (ex) excluirBio(ex.id);
          router.back();
        }}
      />
    </>
  );
}
