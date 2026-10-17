import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Arquivo } from '@/db/exportar';

import { criarRascunho } from './rascunho';

export type ArquivoSalvo = Arquivo & { uri: string; bytes: number };

/** Arquivos da última exportação (para a tela "Arquivo pronto"). */
export const ultimaExportacao = criarRascunho<ArquivoSalvo[]>([]);

/** Grava os arquivos no cache do app (somem quando o sistema precisar de espaço). */
export function salvarArquivos(arquivos: Arquivo[]): ArquivoSalvo[] {
  return arquivos.map((a) => {
    const f = new File(Paths.cache, a.nome);
    f.create({ overwrite: true });
    f.write(a.conteudo);
    return { ...a, uri: f.uri, bytes: f.size ?? a.conteudo.length };
  });
}

export async function compartilhar(a: ArquivoSalvo) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(a.uri, {
    mimeType: a.nome.endsWith('.json') ? 'application/json' : 'text/csv',
    dialogTitle: 'Exportar meus dados',
    UTI: a.nome.endsWith('.json') ? 'public.json' : 'public.comma-separated-values-text',
  });
  return true;
}
