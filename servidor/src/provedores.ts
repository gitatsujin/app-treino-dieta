import { ESQUEMAS, INSTRUCOES, type Alvo } from './esquemas';

export type Provedor = 'claude' | 'gemini' | 'openai';
export type Arquivo = { mime: string; base64: string };
export type Env = {
  CHAVE_APP: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  MODELO_CLAUDE?: string;
  MODELO_GEMINI?: string;
  MODELO_OPENAI?: string;
  MODELO_CLAUDE_RESERVA?: string;
  MODELO_GEMINI_RESERVA?: string;
  MODELO_OPENAI_RESERVA?: string;
  /** Opcional: limite por chamada em segundos (padrão 40). */
  LIMITE_CHAMADA_S?: string;
};

/** Modelos padrão (troque pelas variáveis MODELO_* no wrangler.toml sem mexer no código). */
const PADRAO = { claude: 'claude-sonnet-5-5', gemini: 'gemini-3.8-flash', openai: 'gpt-6.1-sol' };
/** Modelos de reserva, usados quando o principal está sobrecarregado (MODELO_*_RESERVA no wrangler.toml). */
const RESERVA = { claude: 'claude-haiku-5-5', gemini: 'gemini-3.6-flash', openai: 'gpt-6-luna' };

const ehPdf = (a: Arquivo) => a.mime === 'application/pdf';

/** Erro devolvido pela IA, com o status HTTP para decidir se vale tentar de novo. */
export class ErroIA extends Error {
  constructor(
    readonly status: number,
    texto: string,
    /** A IA não respondeu dentro do limite: não vale repetir o mesmo modelo. */
    readonly semResposta = false,
  ) {
    super(`${status}: ${texto.slice(0, 500)}`);
  }
  /** Sobrecarga ou instabilidade passageira (não inclui falta de crédito). */
  get passageiro() {
    if (this.status === 429) return !/insufficient_quota|credit|billing/i.test(this.message);
    return [500, 502, 503, 504, 529].includes(this.status);
  }
}

const temChave = (p: Provedor, env: Env) => !!(p === 'claude' ? env.ANTHROPIC_API_KEY : p === 'gemini' ? env.GEMINI_API_KEY : env.OPENAI_API_KEY);
const LEITORES = { claude, gemini, openai };
const NOME_CHAVE = { claude: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' } as const;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PRAZO_MS = 100_000;
/** Tempo típico de uma leitura; sem ele sobrando, não vale começar outra tentativa. */
const MARGEM_MS = 25_000;
/** Tempo máximo de uma chamada a uma IA; depois disso o plano B segue. */
const LIMITE_CHAMADA_MS = 40_000;

/**
 * Lê com a IA escolhida e, se ela falhar, segue um plano B sem o usuário precisar fazer nada:
 * 1) modelo principal (com 1 nova tentativa se estiver sobrecarregado), 2) modelo de reserva da mesma IA,
 * 3) as outras IAs que tiverem chave configurada.
 */
export async function ler(provedor: Provedor, alvo: Alvo, arquivo: Arquivo, env: Env): Promise<{ dados: unknown; modelo: string; provedor: Provedor; tentativas: string[] }> {
  const principal = (p: Provedor) => (p === 'claude' ? env.MODELO_CLAUDE : p === 'gemini' ? env.MODELO_GEMINI : env.MODELO_OPENAI) || PADRAO[p];
  const reserva = (p: Provedor) => (p === 'claude' ? env.MODELO_CLAUDE_RESERVA : p === 'gemini' ? env.MODELO_GEMINI_RESERVA : env.MODELO_OPENAI_RESERVA) || RESERVA[p];
  const outros = (['claude', 'gemini', 'openai'] as Provedor[]).filter((p) => p !== provedor && temChave(p, env));
  const plano: [Provedor, string][] = [[provedor, principal(provedor)], [provedor, reserva(provedor)], ...outros.map((p) => [p, principal(p)] as [Provedor, string])];
  const vistos = new Set<string>();
  const tentativas: string[] = [];
  const semCredito = new Set<Provedor>(); // falta de crédito vale para a conta toda: não adianta outro modelo
  let primeiro: unknown = null;
  // O app espera até 120 s; o plano B só começa uma tentativa nova se ainda houver tempo para ela.
  const inicio = Date.now();
  const temTempo = () => Date.now() - inicio < PRAZO_MS - MARGEM_MS;
  for (const [p, modelo] of plano) {
    if (!temTempo()) break;
    if (vistos.has(`${p}/${modelo}`)) continue;
    vistos.add(`${p}/${modelo}`);
    if (semCredito.has(p)) continue;
    if (!temChave(p, env)) {
      primeiro ??= new Error(`${NOME_CHAVE[p]} não configurada`);
      continue;
    }
    for (let i = 0; i < 2; i++) {
      try {
        const t0 = Date.now();
        const ms = Math.min(env.LIMITE_CHAMADA_S ? Number(env.LIMITE_CHAMADA_S) * 1000 : LIMITE_CHAMADA_MS, PRAZO_MS - (t0 - inicio));
        console.log(`tentando ${p}/${modelo} (limite ${Math.round(ms / 1000)} s)`);
        const dados = await LEITORES[p](alvo, arquivo, env, modelo, ms);
        console.log(`ok ${p}/${modelo} em ${Date.now() - t0} ms`);
        return { dados, modelo, provedor: p, tentativas };
      } catch (e) {
        console.log(`falhou ${p}/${modelo}: ${String(e).slice(0, 160)}`);
        tentativas.push(`${p}/${modelo}: ${String(e).slice(0, 120)}`);
        primeiro ??= e;
        if (e instanceof ErroIA && (e.status === 401 || e.status === 403 || (e.status === 429 && !e.passageiro))) semCredito.add(p);
        // Só repete o mesmo modelo quando a falha é passageira, e uma vez só.
        if (!(e instanceof ErroIA && e.passageiro) || e.semResposta || i === 1 || !temTempo()) break;
        await espera(1500);
      }
    }
  }
  throw primeiro ?? new Error('Nenhuma IA disponível');
}

async function postar(url: string, headers: Record<string, string>, corpo: unknown, ms: number) {
  let r: Response;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(corpo), signal: AbortSignal.timeout(ms) });
  } catch (e) {
    // IA que não responde a tempo conta como sobrecarga: o plano B segue para a próxima opção.
    if (e instanceof Error && /timeout|abort/i.test(`${e.name} ${e.message}`)) throw new ErroIA(504, `sem resposta em ${Math.round(ms / 1000)} s`, true);
    throw e;
  }
  const texto = await r.text();
  if (!r.ok) throw new ErroIA(r.status, texto);
  return JSON.parse(texto);
}

/* ---------- Claude (Anthropic): saída estruturada por ferramenta obrigatória ---------- */
async function claude(alvo: Alvo, a: Arquivo, env: Env, modelo: string, ms: number): Promise<unknown> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada');
  const midia = ehPdf(a)
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } }
    : { type: 'image', source: { type: 'base64', media_type: a.mime, data: a.base64 } };
  const j = await postar(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    {
      model: modelo,
      max_tokens: 8000,
      system: INSTRUCOES[alvo],
      tools: [{ name: 'registrar', description: 'Registra os dados lidos do documento.', input_schema: ESQUEMAS[alvo] }],
      tool_choice: { type: 'tool', name: 'registrar' },
      messages: [{ role: 'user', content: [midia, { type: 'text', text: 'Leia o documento e registre os dados.' }] }],
    }, ms);
  const uso = (j.content as { type: string; input?: unknown }[]).find((c) => c.type === 'tool_use');
  if (!uso) throw new Error('Claude não devolveu os dados');
  return uso.input;
}

/* ---------- Gemini (Google): responseJsonSchema ---------- */
async function gemini(alvo: Alvo, a: Arquivo, env: Env, modelo: string, ms: number): Promise<unknown> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');
  const j = await postar(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    { 'x-goog-api-key': env.GEMINI_API_KEY },
    {
      systemInstruction: { parts: [{ text: INSTRUCOES[alvo] }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: a.mime, data: a.base64 } }, { text: 'Leia o documento e devolva os dados.' }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: ESQUEMAS[alvo], temperature: 0 },
    }, ms);
  const texto = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!texto) throw new Error('Gemini não devolveu os dados');
  return JSON.parse(texto);
}

/* ---------- GPT (OpenAI): Responses API com json_schema estrito ---------- */
async function openai(alvo: Alvo, a: Arquivo, env: Env, modelo: string, ms: number): Promise<unknown> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');
  const url = `data:${a.mime};base64,${a.base64}`;
  const midia = ehPdf(a) ? { type: 'input_file', filename: 'documento.pdf', file_data: url } : { type: 'input_image', image_url: url };
  const j = await postar(
    'https://api.openai.com/v1/responses',
    { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    {
      model: modelo,
      instructions: INSTRUCOES[alvo],
      input: [{ role: 'user', content: [midia, { type: 'input_text', text: 'Leia o documento e devolva os dados.' }] }],
      text: { format: { type: 'json_schema', name: alvo, schema: ESQUEMAS[alvo], strict: true } },
    }, ms);
  const texto =
    j.output_text ??
    (j.output as { content?: { type: string; text?: string }[] }[] | undefined)
      ?.flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('');
  if (!texto) throw new Error('GPT não devolveu os dados');
  return JSON.parse(texto);
}
