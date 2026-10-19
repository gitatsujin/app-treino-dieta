/**
 * Servidor de leitura do app Treino e Dieta (Cloudflare Worker).
 * Recebe uma foto ou PDF, manda para a IA escolhida e devolve os dados organizados.
 * As chaves das IAs ficam só aqui (segredos do Worker), nunca dentro do app.
 * Nada é gravado: o arquivo existe só durante a requisição.
 */
import type { Alvo } from './esquemas';
import { ler, type Env, type Provedor } from './provedores';

const ALVOS: Alvo[] = ['treino', 'dieta', 'bio', 'rotulo'];
const PROVEDORES: Provedor[] = ['claude', 'gemini', 'openai'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const LIMITE_BYTES = 15 * 1024 * 1024;

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/saude')
      // Só diz quais IAs têm chave configurada (nunca as chaves) e se a chave do app confere.
      return resposta({
        ok: true,
        chave: !!env.CHAVE_APP && req.headers.get('x-chave-app') === env.CHAVE_APP,
        provedores: { claude: !!env.ANTHROPIC_API_KEY, gemini: !!env.GEMINI_API_KEY, openai: !!env.OPENAI_API_KEY },
      });
    if (req.method !== 'POST' || url.pathname !== '/ler') return resposta({ erro: 'Rota não encontrada' }, 404);

    // Chave compartilhada com o app: evita que qualquer um use o servidor (e gaste os créditos das IAs).
    if (!env.CHAVE_APP || req.headers.get('x-chave-app') !== env.CHAVE_APP) return resposta({ erro: 'Não autorizado' }, 401);

    let corpo: { alvo?: Alvo; provedor?: Provedor; mime?: string; base64?: string };
    try {
      corpo = await req.json();
    } catch {
      return resposta({ erro: 'JSON inválido' }, 400);
    }
    const { alvo, provedor = 'claude', mime, base64 } = corpo;
    if (!alvo || !ALVOS.includes(alvo)) return resposta({ erro: 'alvo inválido' }, 400);
    if (!PROVEDORES.includes(provedor)) return resposta({ erro: 'provedor inválido' }, 400);
    if (!mime || !MIMES.includes(mime) || !base64) return resposta({ erro: 'Envie uma imagem JPEG/PNG/WebP ou um PDF' }, 400);
    if (base64.length * 0.75 > LIMITE_BYTES) return resposta({ erro: 'Arquivo grande demais (máximo 15 MB)' }, 413);

    const inicio = Date.now();
    try {
      const { dados, modelo } = await ler(provedor, alvo, { mime, base64 }, env);
      return resposta({ ok: true, provedor, modelo, ms: Date.now() - inicio, dados });
    } catch (e) {
      console.error(provedor, alvo, String(e));
      return resposta({ erro: 'A leitura falhou', detalhe: String(e).slice(0, 300), provedor }, 502);
    }
  },
};
