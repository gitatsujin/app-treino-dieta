import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Image as ImageIcon, Pencil, Sparkles, Zap, ZapOff } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Button, Card, IconTile, Screen, SegmentedControl, TopBar } from '@/components/ui';
import { alimentoPorCodigo, criarAlimento } from '@/db/dieta';
import { escolherArquivo, type Origem } from '@/lib/leitura';
import { buscarProduto } from '@/lib/openfoodfacts';
import { alimentoCriado, arquivoEscolhido } from '@/lib/rascunhos';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Escanear alimento: código de barras (RF38, Open Food Facts) ou tabela nutricional (RF39).
 * A área da câmera fica sempre escura nos dois temas. O X volta para a Início (regra 13).
 */
export default function Escanear() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ modo?: string }>();
  const [modo, setModo] = useState(params.modo === 'tabela' ? 'Tabela nutricional' : 'Código de barras');
  const tabela = modo === 'Tabela nutricional';
  const [perm, pedir] = useCameraPermissions();
  const [luz, setLuz] = useState(false);
  const [estado, setEstado] = useState<{ tipo: 'lendo' | 'buscando' | 'erro'; msg?: string; codigo?: string }>({ tipo: 'lendo' });
  const ocupado = useRef(false);
  const [erroFoto, setErroFoto] = useState('');

  /** Tabela nutricional: foto ou galeria → leitura (IA ou aparelho) → cadastro preenchido para conferir. */
  const fotografar = async (origem: Origem) => {
    setErroFoto('');
    try {
      const arquivo = await escolherArquivo(origem);
      if (!arquivo) return;
      arquivoEscolhido.definir({ alvo: 'rotulo', arquivo });
      router.replace('/dieta/lendo');
    } catch (e) {
      setErroFoto(e instanceof Error ? e.message : 'Não foi possível abrir a câmera.');
    }
  };

  /** Depois de achar o produto, abre "Adicionar alimento" com ele selecionado. */
  const usar = (id: string) => {
    alimentoCriado.definir(id);
    router.replace({ pathname: '/dieta/adicionar', params: { alimento: id } });
  };

  const lido = async (codigo: string) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const local = alimentoPorCodigo(codigo);
    if (local) return usar(local.id);
    setEstado({ tipo: 'buscando', codigo });
    try {
      const p = await buscarProduto(codigo);
      if (!p) {
        router.replace({ pathname: '/dieta/nao-encontrado', params: { codigo } });
        return;
      }
      const id = criarAlimento({ nome: p.nome, marca: p.marca, fonte: 'open_food_facts', codigo_barras: p.codigo, porcao_padrao_g: p.porcao_g, valores: p.valores });
      usar(id);
    } catch {
      setEstado({ tipo: 'erro', codigo, msg: 'Sem conexão com o Open Food Facts. Confira a internet e tente de novo, ou cadastre o produto manualmente.' });
      ocupado.current = false;
    }
  };

  const camera = () => {
    if (!perm) return <ActivityIndicator color="#FFFFFF" />;
    if (!perm.granted)
      return (
        <View style={{ alignItems: 'center', gap: space.md, padding: space.xl }}>
          <Camera size={32} color="#FFFFFF" />
          <AppText style={{ color: '#FFFFFF', textAlign: 'center' }}>Para ler o código de barras, o app precisa usar a câmera.</AppText>
          <Button label={perm.canAskAgain ? 'Permitir câmera' : 'Abra os Ajustes para permitir'} onPress={perm.canAskAgain ? pedir : undefined} disabled={!perm.canAskAgain} />
        </View>
      );
    return (
      <>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={luz}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={estado.tipo === 'lendo' ? ({ data }) => lido(data) : undefined}
        />
        <View style={[styles.frame, { width: 260, height: 150 }]}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.corner, styles[c]]} />
          ))}
          <View style={[styles.scanLine, { backgroundColor: colors.accent }]} />
        </View>
        <AppText style={styles.hint}>{estado.tipo === 'buscando' ? 'Buscando o produto…' : 'Aponte para o código de barras'}</AppText>
        <Pressable accessibilityLabel={luz ? 'Desligar lanterna' : 'Ligar lanterna'} onPress={() => setLuz(!luz)} style={styles.flash}>
          {luz ? <ZapOff size={20} color="#FFFFFF" /> : <Zap size={20} color="#FFFFFF" />}
        </Pressable>
      </>
    );
  };

  return (
    <Screen
      header={<TopBar title="Escanear" leading="close" onLeadingPress={() => router.dismissTo('/')} />}
      footer={tabela ? <BottomActionBar primary={{ label: 'Fotografar tabela', onPress: () => fotografar('camera') }} /> : undefined}>
      <SegmentedControl options={['Código de barras', 'Tabela nutricional']} selected={modo} onChange={setModo} />
      {tabela ? (
        <>
          <View style={[styles.camera, { height: 220 }]}>
            <IconTile icon={Sparkles} tone="neutral" size={52} />
          </View>
          <Banner icon={Sparkles} tone="neutral" message="Fotografe a tabela inteira, de frente e com boa luz. Os valores preenchem o cadastro e você confere antes de salvar." />
          <Button variant="secondary" icon={ImageIcon} label="Escolher da galeria" onPress={() => fotografar('galeria')} />
          {erroFoto ? (
            <AppText variant="bodySmall" color="dietStrong">
              {erroFoto}
            </AppText>
          ) : null}
        </>
      ) : (
        <>
          <View style={[styles.camera, { height: 300 }]}>{camera()}</View>
          {estado.tipo === 'buscando' ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
                <ActivityIndicator color={colors.accent} />
                <AppText>Código {estado.codigo} · consultando o Open Food Facts…</AppText>
              </View>
            </Card>
          ) : estado.tipo === 'erro' ? (
            <Card>
              <AppText color="dietStrong">{estado.msg}</AppText>
              <Button variant="secondary" label="Tentar de novo" onPress={() => estado.codigo && lido(estado.codigo)} />
              <Button label="Cadastrar manualmente" onPress={() => router.replace({ pathname: '/dieta/novo-alimento', params: { codigo: estado.codigo } })} />
            </Card>
          ) : (
            <AppText variant="bodySmall" color="textMuted">
              Produtos lidos ficam salvos nos seus alimentos e da próxima vez aparecem mesmo sem internet.
            </AppText>
          )}
        </>
      )}
      <Pressable onPress={() => router.replace('/dieta/novo-alimento')} style={styles.manual}>
        <Pencil size={18} color={colors.accent} />
        <AppText color="textMuted">Prefere digitar?</AppText>
        <AppText variant="button" color="accent" style={{ fontFamily: font.semibold }}>
          Adicionar manualmente
        </AppText>
      </Pressable>
    </Screen>
  );
}

const C = 4;
const styles = StyleSheet.create({
  camera: { borderRadius: 20, backgroundColor: '#15181C', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frame: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: C, borderLeftWidth: C, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderTopWidth: C, borderRightWidth: C, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderBottomWidth: C, borderLeftWidth: C, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderBottomWidth: C, borderRightWidth: C, borderBottomRightRadius: 6 },
  scanLine: { width: '86%', height: 2, borderRadius: 1 },
  hint: { position: 'absolute', bottom: 18, color: '#FFFFFF', fontFamily: font.medium, fontSize: 14 },
  flash: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  manual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.md },
});
