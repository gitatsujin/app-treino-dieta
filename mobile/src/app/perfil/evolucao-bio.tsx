import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { GraficoLinha } from '@/components/Grafico';
import { AppText, Card, ChipGroup, Divider, Screen, Tag, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { bios, medidasDaBio, usuario, type Bio } from '@/db/perfil';
import { imc } from '@/lib/calculos';
import { dataCompleta, dataCurta, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';

type Med = { nome: string; medida: string; un: string; v: (b: Bio, altura: number) => number | null };
const MEDIDAS: Med[] = [
  { nome: 'Gordura', medida: 'Gordura corporal', un: '%', v: (b) => b.gordura_pct },
  { nome: 'Músculo', medida: 'Músculo esquelético', un: '%', v: (b) => b.musculo_esqueletico_pct },
  { nome: 'Visceral', medida: 'Gordura visceral', un: '', v: (b) => b.gordura_visceral_nivel },
  { nome: 'TMB', medida: 'Metabolismo em repouso', un: ' kcal', v: (b) => b.metabolismo_repouso_kcal },
  { nome: 'Peso', medida: 'Peso', un: ' kg', v: (b) => b.peso_kg },
  { nome: 'IMC', medida: 'IMC', un: '', v: (b, a) => imc(b.peso_kg, a) },
];

/** Evolução da bioimpedância: medida escolhida, gráfico e comparação dos exames (RF42). */
export default function EvolucaoBio() {
  const [nome, setNome] = useState('Gordura');
  const d = useConsulta(() => ({ lista: bios(), u: usuario() }));
  const m = MEDIDAS.find((x) => x.nome === nome)!;
  const alt = d.u?.altura_cm ?? 170;
  const crono = [...d.lista].reverse();
  const pts = crono.map((b) => ({ data: b.data, v: m.v(b, alt) })).filter((p): p is { data: string; v: number } => p.v != null);
  const ultimo = d.lista[0];
  const classe = ultimo && d.u ? medidasDaBio(ultimo, d.u).find((x) => x.nome === m.medida)?.classe : undefined;
  const delta = pts.length >= 2 ? pts[pts.length - 1].v - pts[0].v : null;
  const ultimos = d.lista.slice(0, 3).reverse();

  if (!d.lista.length) {
    return (
      <Screen header={<TopBar title="Evolução" subtitle="Bioimpedância" />}>
        <Card>
          <AppText color="textMuted">Nenhum exame registrado ainda.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen header={<TopBar title="Evolução" subtitle="Bioimpedância" />}>
      <ChipGroup options={MEDIDAS.map((x) => x.nome)} selected={nome} onChange={setNome} />
      <Card gap={space.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AppText style={{ fontFamily: font.bold, fontSize: 30 }}>{pts.length ? `${num(pts[pts.length - 1].v)}${m.un}` : '—'}</AppText>
          {classe ? <Tag label={classe} tone={classe === 'Normal' ? 'near' : 'mid'} /> : null}
        </View>
        {delta != null ? (
          <AppText variant="bodySmall" color="textMuted">
            {Math.abs(delta) < 0.05 ? 'Sem mudança' : `${delta > 0 ? '+' : '−'}${num(Math.abs(delta))}${m.un === '%' ? ' pontos' : m.un}`} desde {dataCompleta(pts[0].data)}
          </AppText>
        ) : null}
        {pts.length >= 2 ? (
          <GraficoLinha valores={pts.map((p) => p.v)} datas={pts.map((p) => p.data)} />
        ) : (
          <AppText variant="bodySmall" color="textMuted">
            O gráfico aparece a partir de dois exames com esta medida.
          </AppText>
        )}
      </Card>
      <Card gap={0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: '100%' }}>
            {[['Medida', ...ultimos.map((b) => dataCurta(b.data))], ...MEDIDAS.map((x) => [x.nome, ...ultimos.map((b) => (x.v(b, alt) == null ? '—' : num(x.v(b, alt)!)))])].map((r, i) => (
              <View key={r[0]}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', paddingVertical: space.md, gap: 6 }}>
                  {r.map((c, j) => (
                    <AppText
                      key={j}
                      color={i === 0 || j === 0 ? 'textMuted' : 'text'}
                      style={[{ fontSize: i === 0 ? 11 : 13, fontFamily: i === 0 || j === 0 ? font.medium : font.semibold }, j === 0 ? { flex: 1, minWidth: 80 } : { width: 64, textAlign: 'right' }]}>
                      {c}
                    </AppText>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {d.lista.map((b, i) => (
          <View key={b.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => router.push({ pathname: '/perfil/bioimpedancia', params: { id: b.id } })} style={{ paddingVertical: space.md }}>
              <AppText variant="itemTitle">{dataCompleta(b.data)}</AppText>
              <AppText variant="caption" color="textMuted">
                Toque para ver ou corrigir
              </AppText>
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
