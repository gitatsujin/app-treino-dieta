# Servidor de leitura (Cloudflare Worker)

Lê fotos e PDFs (ficha de treino, dieta, laudo de bioimpedância, tabela nutricional) com a IA escolhida no app
e devolve os dados estruturados. O app sempre mostra o resultado para revisão antes de salvar.

- `GET /saude`: diz se o servidor está no ar, se a chave do app confere e quais IAs têm chave (nunca as chaves).
- `POST /ler`: `{ alvo, provedor, mime, base64 }` com o cabeçalho `x-chave-app`. Limite de 15 MB.
- Provedores: `claude` (Anthropic), `gemini` (Google), `openai` (OpenAI). O arquivo não é guardado.
- Plano B automático: se a IA escolhida estiver sobrecarregada, o servidor tenta de novo, depois o modelo de
  reserva (`MODELO_*_RESERVA`) e por fim as outras IAs com chave. A resposta diz qual IA leu (`provedor`).

## Publicar (uma vez)

```bash
cd servidor
npm install
npx wrangler login                          # abre o navegador para entrar na conta Cloudflare (grátis)
npx wrangler secret put CHAVE_APP           # invente uma senha longa; a mesma vai no app
npx wrangler secret put ANTHROPIC_API_KEY   # console.anthropic.com › API Keys
npx wrangler secret put GEMINI_API_KEY      # aistudio.google.com › Get API key
npx wrangler secret put OPENAI_API_KEY      # platform.openai.com › API keys
npx wrangler deploy                         # mostra o endereço: https://treino-dieta-leitura.<conta>.workers.dev
```

Só precisa das chaves das IAs que for usar. No app: Perfil › Leitura de arquivos › Servidor de leitura,
cole o endereço e a CHAVE_APP e toque em "Salvar e testar conexão".

## Trocar o modelo

Os modelos ficam em `wrangler.toml` (`MODELO_CLAUDE`, `MODELO_GEMINI`, `MODELO_OPENAI` e os `_RESERVA`). Edite e rode `npx wrangler deploy`.

## Regras

- Chaves de API **nunca** vão para o app nem para o repositório: só `wrangler secret put`.
- Para testar localmente, crie `.dev.vars` (já está no `.gitignore`) com as mesmas variáveis e rode `npx wrangler dev`.
