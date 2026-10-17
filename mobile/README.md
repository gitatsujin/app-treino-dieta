# Treino e Dieta — app

App em React Native com Expo (SDK 57, a versão aceita pelo Expo Go atual), Expo Router e TypeScript. Os requisitos, o modelo de dados e o guia de interface estão na raiz do repositório.

## Rodar no Mac

```bash
cd mobile
npm install
npx expo start
```

- `i` abre no simulador do iPhone (precisa do Xcode).
- Ou leia o QR code com o app **Expo Go** no celular.

## Estrutura

```
src/
├── app/                     rotas (cada arquivo é uma tela)
│   ├── _layout.tsx          abre o banco, fontes, tema e quais telas abrem por cima
│   ├── (tabs)/              as 5 abas: metas, treino, index (Início), dieta, perfil
│   ├── treino/              treino de hoje, em andamento, concluído, plano, histórico…
│   ├── dieta/               refeição, adicionar, escanear, editar dieta, histórico…
│   ├── metas/               nova, detalhe, atingida, concluídas
│   ├── perfil/              editar, peso, bioimpedância, ciclo, exportar, configurações…
│   ├── entrada/             boas-vindas, consentimento, conectar saúde
│   └── exemplo.tsx          carrega dados de exemplo (só em desenvolvimento)
├── db/                      banco local (SQLite) e regras de cada área
│   ├── esquema.ts           tabelas (modelo-de-dados.md) e migrações
│   ├── sementes.ts          nutrientes, exercícios e alimentos que vêm com o app
│   ├── conexao.ts           acesso ao banco e useConsulta (tela relê ao gravar)
│   └── perfil.ts, treino.ts, dieta.ts, metas.ts, exportar.ts
├── lib/                     cálculos (TMB, IMC, METs, ciclo), formatação pt-BR, Open Food Facts
├── components/              componentes do guia de interface (ui/) e blocos das telas
└── theme/                   tokens.ts e use-theme.ts
```

Os dados ficam só no aparelho, no arquivo `treino-dieta.db` (RNF05). As telas nunca falam com o SQLite direto: chamam as funções de `src/db/`, e `useConsulta` relê os dados sempre que algo é gravado.

Para testar com um histórico pronto, abra **Perfil › Dados de exemplo** (só aparece no modo de desenvolvimento). Lá também dá para apagar tudo e recomeçar do cadastro.

## O que ainda não funciona no Expo Go

- Integração com Apple Saúde e Health Connect: precisa do app instalável (build próprio).
- Leitura de ficha, dieta, laudo e tabela nutricional por foto ou PDF: depende de um serviço de reconhecimento. As telas levam ao cadastro manual.

## Regras

- Use só os tokens de `src/theme/tokens.ts`; nada de cores soltas.
- Toda tela usa `<Screen>`: cabeçalho e rodapé fixos, só o meio rola.
- Instale pacotes com `npx expo install <pacote>`, para pegar versões compatíveis com o SDK.
- Antes de cada commit: `npm run typecheck`.
