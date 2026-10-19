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
};

/** Modelos padrão (troque pelas variáveis MODELO_* no wrangler.toml sem mexer no código). */
const PADRAO = { claude: 'claude-sonnet-5-5', gemini: 'gemini-3.8-flash', openai: 'gpt-6.1-sol' };

const ehPdf = (a: Arquivo) => a.mime === 'application/pdf';

export async function ler(provedor: Provedor, alvo: Alvo, arquivo: Arquivo, env: Env): Promise<{ dados: unknown; modelo: string }> {
  if (provedor === 'claude') return claude(alvo, arquivo, env);
  if (provedor === 'gemini') return gemini(alvo, arquivo, env);
  return openai(alvo, arquivo, env);
}

async function postar(url: string, headers: Record<string, string>, corpo: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(corpo) });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${texto.slice(0, 500)}`);
  return JSON.parse(texto);
}

/* ---------- Claude (Anthropic): saída estruturada por ferramenta obrigatória ---------- */
async function claude(alvo: Alvo, a: Arquivo, env: Env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada');
  const modelo = env.MODELO_CLAUDE || PADRAO.claude;
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
    },
  );
  const uso = (j.content as { type: string; input?: unknown }[]).find((c) => c.type === 'tool_use');
  if (!uso) throw new Error('Claude não devolveu os dados');
  return { dados: uso.input, modelo };
}

/* ---------- Gemini (Google): responseJsonSchema ---------- */
async function gemini(alvo: Alvo, a: Arquivo, env: Env) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada');
  const modelo = env.MODELO_GEMINI || PADRAO.gemini;
  const j = await postar(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    { 'x-goog-api-key': env.GEMINI_API_KEY },
    {
      systemInstruction: { parts: [{ text: INSTRUCOES[alvo] }] },
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: a.mime, data: a.base64 } }, { text: 'Leia o documento e devolva os dados.' }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: ESQUEMAS[alvo], temperature: 0 },
    },
  );
  const texto = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  if (!texto) throw new Error('Gemini não devolveu os dados');
  return { dados: JSON.parse(texto), modelo };
}

/* ---------- GPT (OpenAI): Responses API com json_schema estrito ---------- */
async function openai(alvo: Alvo, a: Arquivo, env: Env) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');
  const modelo = env.MODELO_OPENAI || PADRAO.openai;
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
    },
  );
  const texto =
    j.output_text ??
    (j.output as { content?: { type: string; text?: string }[] }[] | undefined)
      ?.flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text)
      .join('');
  if (!texto) throw new Error('GPT não devolveu os dados');
  return { dados: JSON.parse(texto), modelo };
}
