import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Database, Download, Droplet, Flame, Heart, Info, Lock, Moon, Ruler, ScanText, Target, Weight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, IconTile, ListRow, Row, Screen, ScreenHeader, SectionHeader, StatCard, Tag } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { dietaAtiva } from '@/db/dieta';
import { bios, medidasDaBio, pesoAtual, pesos, pref, tmb, usuario } from '@/db/perfil';
import { idade } from '@/lib/calculos';
import { configLeitura, PROVEDORES } from '@/lib/leitura';
import { integracaoAtiva, NOME_SAUDE } from '@/lib/saude';
import { dataCompleta, dataCurta, diasEntre, num, somarDias } from '@/lib/formato';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TOM: Record<string, 'near' | 'mid' | 'far' | 'neutral'> = { Normal: 'near', Baixo: 'mid', Alto: 'mid', 'Muito alto': 'far', 'Abaixo do peso': 'mid', Sobrepeso: 'mid', Obeso: 'far' };

/** Aba Perfil (RF23, RF41–RF43, RF47–RF49). */
export default function PerfilScreen() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const d = useConsulta(() => {
    const u = usuario();
    const b = bios()[0] ?? null;
    return {
      u,
      peso: pesoAtual(),
      pesoSemana: pesos().find((p) => diasEntre(p.data, hoje) >= 7) ?? null,
      tmb: tmb(hoje),
      bio: b,
      medidas: b && u ? medidasDaBio(b, u, hoje) : [],
      tema: pref('tema'),
      dieta: !!dietaAtiva(),
      leitura: configLeitura(),
      saude: !!integracaoAtiva(),
    };
  });
  if (!d.u) return null;
  const u = d.u;
  const config: { icon: LucideIcon; label: string; value?: string; href: Href }[] = [
    { icon: Moon, label: 'Tema', value: d.tema === 'claro' ? 'Claro' : d.tema === 'escuro' ? 'Escuro' : 'Automático', href: '/perfil/tema' },
    { icon: Ruler, label: 'Unidades', value: 'kg, cm', href: '/perfil/unidades' },
    { icon: Target, label: 'Meta de calorias', value: d.dieta ? 'Pela dieta' : u.meta_calorias_kcal ? `${num(u.meta_calorias_kcal, 0)} kcal` : 'Sem meta', href: '/perfil/meta-calorias' },
    ...(u.sexo === 'feminino' ? [{ icon: Droplet, label: 'Ciclo menstrual', value: u.ciclo_ativo ? 'Ativado' : 'Desativado', href: '/perfil/ciclo' as Href }] : []),
    { icon: ScanText, label: 'Leitura de arquivos', value: PROVEDORES[d.leitura.provedor].split(' (')[0], href: '/perfil/leitura' },
    { icon: Lock, label: 'Privacidade e dados', href: '/perfil/privacidade' },
    { icon: Download, label: 'Exportar meus dados', href: '/perfil/exportar' },
    { icon: Info, label: 'Sobre o app', href: '/perfil/sobre' },
  ];
  const variacao = d.peso && d.pesoSemana ? d.peso.peso_kg - d.pesoSemana.peso_kg : null;

  return (
    <Screen header={<ScreenHeader title="Perfil" />}>
      <Card>
        <View style={styles.item}>
          <Avatar initial={u.nome.charAt(0).toUpperCase()} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 19 }}>{u.nome}</AppText>
            <AppText variant="bodySmall" color="textMuted">
              {idade(u.data_nascimento, hoje)} anos · {num(u.altura_cm / 100, 2)} m · {u.sexo === 'feminino' ? 'Feminino' : 'Masculino'}
            </AppText>
          </View>
        </View>
        <Button variant="secondary" label="Editar perfil" onPress={() => router.push('/perfil/editar')} />
      </Card>

      <Row>
        <StatCard
          icon={Weight}
          label="Peso"
          value={d.peso ? `${num(d.peso.peso_kg)} kg` : '—'}
          detail={variacao != null ? (Math.abs(variacao) < 0.05 ? 'estável na semana' : `${variacao > 0 ? '+' : '−'}${num(Math.abs(variacao))} kg na semana`) : d.peso ? dataCurta(d.peso.data) : 'sem registro'}
          onPress={() => router.push('/perfil/peso')}
        />
        <StatCard
          icon={Flame}
          tone="diet"
          label="TMB"
          value={d.tmb ? `${num(d.tmb.kcal, 0)} kcal` : '—'}
          detail={d.tmb?.origem === 'bioimpedancia' ? 'pela bioimpedância' : 'pela fórmula'}
          onPress={() => router.push('/perfil/meta-calorias')}
        />
      </Row>

      <SectionHeader title="Bioimpedância" actionLabel={d.bio ? 'Histórico' : undefined} onAction={() => router.push('/perfil/evolucao-bio')} />
      <Card onPress={d.bio ? () => router.push('/perfil/evolucao-bio') : undefined}>
        {d.bio ? (
          <>
            <View style={styles.between}>
              <View style={{ gap: 2 }}>
                <AppText variant="caption" color="textMuted">
                  Último exame
                </AppText>
                <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                  {dataCompleta(d.bio.data)}
                </AppText>
              </View>
              {/* RF60: nova bioimpedância a cada 3 meses. */}
              <Tag label={somarDias(d.bio.data, 90) <= hoje ? 'Hora de um novo exame' : `Próximo em ${dataCurta(somarDias(d.bio.data, 90))}`} tone={somarDias(d.bio.data, 90) <= hoje ? 'diet' : 'neutral'} />
            </View>
            <Divider />
            <View style={styles.grid}>
              {d.medidas.map((m) => (
                <View key={m.nome} style={styles.cell}>
                  <AppText variant="caption" color="textMuted">
                    {m.nome}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                      {m.valor}
                    </AppText>
                    {m.classe ? <Tag label={m.classe} tone={TOM[m.classe] ?? 'neutral'} /> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <AppText color="textMuted">Registre o resultado do seu exame para acompanhar gordura, músculo e metabolismo. O metabolismo em repouso passa a ser sua TMB.</AppText>
        )}
        <Button label="Registrar bioimpedância" onPress={() => router.push('/perfil/bioimpedancia')} />
      </Card>

      <SectionHeader title="Integrações" />
      <Card onPress={() => router.push('/perfil/apple-saude')}>
        <View style={styles.item}>
          <IconTile icon={Heart} tone="diet" size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="itemTitle">{NOME_SAUDE}</AppText>
            <AppText variant="caption" color="textMuted">
              {d.saude ? 'Conectado · gasto do dia pelo relógio' : 'Conecte para ler treinos e gasto do relógio'}
            </AppText>
          </View>
          <Tag label={d.saude ? 'Conectado' : 'Desligado'} tone={d.saude ? 'near' : 'neutral'} />
        </View>
      </Card>

      <SectionHeader title="Configurações" />
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {config.map((c, i) => (
          <View key={c.label}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              leading={<c.icon size={20} color={colors.textMuted} />}
              title={c.label}
              trailing={
                c.value ? (
                  <AppText variant="bodySmall" color="textMuted">
                    {c.value}
                  </AppText>
                ) : undefined
              }
              chevron
              onPress={() => router.push(c.href)}
            />
          </View>
        ))}
      </Card>

      {__DEV__ ? (
        <>
          <SectionHeader title="Desenvolvimento" />
          <Card gap={0} style={{ paddingVertical: space.xs }}>
            <ListRow
              leading={<Database size={20} color={colors.textMuted} />}
              title="Dados de exemplo"
              subtitle="Preenche o app com um histórico para testar"
              chevron
              onPress={() => router.push('/exemplo')}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  cell: { width: '50%', gap: 4 },
});
