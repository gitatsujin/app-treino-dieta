import { CheckCircle2, CircleAlert, Cloud, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText, Button, Card, Divider, ListRow, Radio, Screen, SectionHeader, TextField, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { definirPref } from '@/db/perfil';
import { configLeitura, leituraNoAparelhoDisponivel, PROVEDORES, type Provedor } from '@/lib/leitura';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MODOS: [valor: string, titulo: string, sub: string][] = [
  ['auto', 'Automático', 'IA com internet; sem internet, o celular lê'],
  ['ia', 'Só com IA', 'Sempre envia para a IA (precisa de internet)'],
  ['aparelho', 'Só no aparelho', 'Nada sai do celular; lê só fotos de texto impresso'],
];

/** Perfil › Leitura de arquivos: qual IA lê as fotos e PDFs, e quando usar a leitura sem internet. */
export default function Leitura() {
  const { colors } = useTheme();
  const cfg = useConsulta(() => configLeitura());
  const [url, setUrl] = useState(cfg.url);
  const [chave, setChave] = useState(cfg.chave);
  const [teste, setTeste] = useState<{ tipo: 'testando' | 'ok' | 'erro'; msg?: string } | null>(null);
  const offline = leituraNoAparelhoDisponivel();

  const salvarServidor = async () => {
    const u = url.trim().replace(/\/+$/, '');
    definirPref('leitura_url', u || null);
    definirPref('leitura_chave', chave.trim() || null);
    if (!u) return setTeste(null);
    setTeste({ tipo: 'testando' });
    try {
      const r = await fetch(`${u}/saude`, { headers: { 'x-chave-app': chave.trim() } });
      const j = (await r.json()) as { ok?: boolean; chave?: boolean; provedores?: Record<string, boolean> };
      if (!r.ok || !j.ok) throw new Error(`Servidor respondeu ${r.status}`);
      if (!j.chave) throw new Error('Servidor encontrado, mas a chave do app não confere.');
      const sem = Object.entries(j.provedores ?? {})
        .filter(([, v]) => !v)
        .map(([k]) => PROVEDORES[k as Provedor] ?? k);
      setTeste({ tipo: 'ok', msg: sem.length ? `Conectado. Sem chave configurada: ${sem.join(', ')}.` : 'Conectado. As três IAs estão configuradas.' });
    } catch (e) {
      setTeste({ tipo: 'erro', msg: e instanceof Error ? e.message : 'Não foi possível conectar.' });
    }
  };

  return (
    <Screen header={<TopBar title="Leitura de arquivos" />}>
      <AppText color="textMuted">Fotos e PDFs de fichas, dietas, laudos e tabelas nutricionais são lidos e viram um rascunho. Você sempre revisa antes de salvar.</AppText>

      <SectionHeader title="IA usada na leitura" />
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {(Object.keys(PROVEDORES) as Provedor[]).map((p, i) => (
          <View key={p}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={PROVEDORES[p]} trailing={<Radio selected={cfg.provedor === p} />} onPress={() => definirPref('leitura_provedor', p)} />
          </View>
        ))}
      </Card>

      <SectionHeader title="Quando usar" />
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {MODOS.map(([v, t, s], i) => (
          <View key={v}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={t} subtitle={s} trailing={<Radio selected={cfg.modo === v} />} onPress={() => definirPref('leitura_modo', v === 'auto' ? null : v)} />
          </View>
        ))}
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Smartphone size={18} color={offline ? colors.accent : colors.textMuted} />
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            {offline ? 'Leitura sem internet disponível neste aparelho.' : 'Leitura sem internet indisponível aqui (só no app instalado, não no Expo Go).'}
          </AppText>
        </View>
      </Card>

      <SectionHeader title="Servidor de leitura" />
      <TextField label="Endereço" value={url} onChangeText={setUrl} placeholder="https://leitura.seu-usuario.workers.dev" autoCapitalize="none" keyboardType="url" />
      <TextField label="Chave do app" value={chave} onChangeText={setChave} placeholder="A mesma de CHAVE_APP no servidor" autoCapitalize="none" secureTextEntry />
      <Button variant="secondary" icon={Cloud} label="Salvar e testar conexão" onPress={salvarServidor} />
      {teste ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {teste.tipo === 'testando' ? <ActivityIndicator color={colors.accent} /> : teste.tipo === 'ok' ? <CheckCircle2 size={18} color={colors.accent} /> : <CircleAlert size={18} color={colors.dietStrong} />}
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            {teste.tipo === 'testando' ? 'Testando…' : teste.msg}
          </AppText>
        </View>
      ) : null}
      <AppText variant="caption" color="textMuted">
        As chaves das IAs ficam só no servidor, nunca no app. O arquivo é enviado apenas para a leitura e não fica guardado no servidor do app; cada IA segue a política de dados do seu fornecedor.
      </AppText>
    </Screen>
  );
}
