/**
 * Importação por foto ou PDF (RF05–RF07, RF15–RF17, RF39, RF50).
 * Com internet: o arquivo vai para o servidor de leitura (IA escolhida). Sem internet, ou se o servidor falhar:
 * reconhecimento de texto no aparelho + regras. Em qualquer caso, nada é salvo sem revisão (RN01).
 */
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { agoraIso, atualizar, gravar, inserir } from '@/db/conexao';
import { pref } from '@/db/perfil';

import { interpretarBio, interpretarDieta, interpretarRotulo, interpretarTreino } from './interpretar';
import type { Alvo, Arquivo, Leitura, Lido, Provedor } from './tipos';

export * from './tipos';

export const PROVEDORES: Record<Provedor, string> = { claude: 'Claude (Anthropic)', gemini: 'Gemini (Google)', openai: 'GPT (OpenAI)' };

/* ---------- Configuração (app.json › extra.leitura, com ajuste em Perfil › Leitura de arquivos) ---------- */

export function configLeitura() {
  const extra = (Constants.expoConfig?.extra as { leitura?: { url?: string; chave?: string } } | undefined)?.leitura ?? {};
  return {
    url: (pref('leitura_url') || extra.url || '').replace(/\/+$/, ''),
    chave: pref('leitura_chave') || extra.chave || '',
    provedor: (pref('leitura_provedor') as Provedor | null) ?? 'claude',
    modo: (pref('leitura_modo') as 'auto' | 'ia' | 'aparelho' | null) ?? 'auto',
  };
}

/* ---------- Escolher o arquivo ---------- */

export type Origem = 'camera' | 'galeria' | 'pdf';

export async function escolherArquivo(origem: Origem): Promise<Arquivo | null> {
  if (origem === 'pdf') {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return null;
    return { uri: r.assets[0].uri, mime: 'application/pdf', nome: r.assets[0].name };
  }
  if (origem === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error('Permita o uso da câmera nos Ajustes do celular para fotografar.');
  }
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
  const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, mime: a.mimeType ?? 'image/jpeg', nome: a.fileName ?? 'foto.jpg' };
}

/** Guarda uma cópia do arquivo dentro do app (área privada, RNF04) para a importação. */
async function guardarCopia(a: Arquivo, id: string): Promise<Arquivo> {
  try {
    const pasta = new Directory(Paths.document, 'importacoes');
    if (!pasta.exists) pasta.create({ intermediates: true });
    const ext = a.mime === 'application/pdf' ? 'pdf' : a.mime === 'image/png' ? 'png' : 'jpg';
    const destino = new File(pasta, `${id}.${ext}`);
    await new File(a.uri).copy(destino);
    return { ...a, uri: destino.uri };
  } catch {
    return a;
  }
}

/** Reduz fotos grandes antes de enviar (mais rápido e mais barato), mantendo a leitura nítida. */
async function prepararImagem(a: Arquivo): Promise<Arquivo> {
  if (a.mime === 'application/pdf') return a;
  try {
    const ctx = ImageManipulator.manipulate(a.uri).resize({ width: 2000 });
    const img = await ctx.renderAsync();
    const r = await img.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return { uri: r.uri, mime: 'image/jpeg', nome: a.nome };
  } catch {
    return a;
  }
}

/* ---------- Leitura pela IA (servidor) ---------- */

async function lerComIA<A extends Alvo>(alvo: A, a: Arquivo): Promise<{ dados: Lido[A]; provedor: Provedor; modelo: string }> {
  const cfg = configLeitura();
  if (!cfg.url || !cfg.chave) throw new Error('SEM_SERVIDOR');
  const arq = await prepararImagem(a);
  const base64 = await new File(arq.uri).base64();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch(`${cfg.url}/ler`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-chave-app': cfg.chave },
      body: JSON.stringify({ alvo, provedor: cfg.provedor, mime: arq.mime, base64 }),
      signal: ctrl.signal,
    });
    const j = (await r.json()) as { ok?: boolean; dados?: Lido[A]; modelo?: string; erro?: string; detalhe?: string };
    if (!r.ok || !j.dados) throw new Error(j.erro ? `${j.erro}${j.detalhe ? `: ${j.detalhe}` : ''}` : `Servidor respondeu ${r.status}`);
    return { dados: j.dados, provedor: cfg.provedor, modelo: j.modelo ?? '' };
  } finally {
    clearTimeout(t);
  }
}

/* ---------- Leitura no aparelho (sem internet) ---------- */

type Extrator = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

/** O módulo nativo só existe no app instalável; no Expo Go ele não carrega. */
function extrator(): Extrator | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('expo-text-extractor') as Extrator;
    return m.isSupported ? m : null;
  } catch {
    return null;
  }
}

export const leituraNoAparelhoDisponivel = () => extrator() != null;

const INTERPRETAR: { [A in Alvo]: (b: string[]) => Lido[A] } = { treino: interpretarTreino, dieta: interpretarDieta, bio: interpretarBio, rotulo: interpretarRotulo };

async function lerNoAparelho<A extends Alvo>(alvo: A, a: Arquivo): Promise<Lido[A]> {
  if (a.mime === 'application/pdf') throw new Error('PDF_OFFLINE');
  const ex = extrator();
  if (!ex) throw new Error('SEM_OCR');
  const blocos = await ex.extractTextFromImage(a.uri);
  if (!blocos.length) throw new Error('Não encontramos texto na imagem. Tente uma foto mais nítida, com boa luz.');
  return INTERPRETAR[alvo](blocos);
}

/* ---------- Fluxo completo ---------- */

const MENSAGENS: Record<string, string> = {
  SEM_SERVIDOR: 'A leitura com IA ainda não está configurada (Perfil › Leitura de arquivos).',
  PDF_OFFLINE: 'PDF precisa de internet para ser lido. Conecte-se e tente de novo, ou envie uma foto.',
  SEM_OCR: 'A leitura sem internet só funciona no app instalável. Conecte-se à internet para ler com IA.',
};

export class ErroLeitura extends Error {}

export async function lerArquivo<A extends Alvo>(alvo: A, original: Arquivo): Promise<Leitura<A>> {
  const id = gravar(() =>
    inserir('importacao', { alvo: alvo === 'treino' ? 'plano_treino' : alvo === 'rotulo' ? 'alimento_rotulo' : alvo === 'bio' ? 'bioimpedancia' : 'dieta', formato: original.mime === 'application/pdf' ? 'pdf' : 'foto', status: 'processando' }),
  );
  const arquivo = await guardarCopia(original, id);
  const cfg = configLeitura();
  const erros: string[] = [];
  let resultado: Omit<Leitura<A>, 'arquivo' | 'importacaoId' | 'alvo'> | null = null;

  if (cfg.modo !== 'aparelho') {
    try {
      const r = await lerComIA(alvo, arquivo);
      resultado = { dados: r.dados, via: 'ia', provedor: r.provedor, modelo: r.modelo };
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (!resultado && cfg.modo !== 'ia') {
    try {
      resultado = { dados: await lerNoAparelho(alvo, arquivo), via: 'aparelho' };
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (!resultado) {
    gravar(() => atualizar('importacao', id, { status: 'erro', arquivo_uri: arquivo.uri, resultado_json: JSON.stringify({ erros }) }));
    const conhecida = erros.map((e) => MENSAGENS[e]).find(Boolean);
    const outra = erros.find((e) => !MENSAGENS[e]);
    throw new ErroLeitura(outra ? `Não foi possível ler o arquivo. ${outra.includes('Network') || outra.includes('abort') ? 'Verifique a internet.' : outra}` : (conhecida ?? 'Não foi possível ler o arquivo.'));
  }
  gravar(() => atualizar('importacao', id, { status: 'aguardando_revisao', arquivo_uri: arquivo.uri, resultado_json: JSON.stringify(resultado) }));
  return { ...resultado, alvo, arquivo, importacaoId: id } as Leitura<A>;
}

export function concluirImportacao(id: string, confirmada: boolean) {
  gravar(() => atualizar('importacao', id, { status: confirmada ? 'confirmada' : 'descartada', atualizado_em: agoraIso() }));
}
