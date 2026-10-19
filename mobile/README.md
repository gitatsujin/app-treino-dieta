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

## App instalável no iPhone (dev build)

Necessário para a leitura sem internet e, depois, para o Apple Saúde. Com o iPhone ligado no Mac por cabo:

```bash
cd mobile
npm install
npm run ios:aparelho        # = npx expo run:ios --device
```

1. Na primeira vez o Expo cria a pasta `ios/` e abre a escolha do aparelho: escolha o seu iPhone.
2. Se der erro de assinatura: abra o arquivo `.xcworkspace` da pasta `ios/` no Xcode › alvo do app › Signing & Capabilities ›
   marque "Automatically manage signing" e em Team escolha seu Apple ID (Personal Team). Rode o comando de novo.
3. No iPhone: Ajustes › Geral › VPN e Gerenciamento de Dispositivo › confie no seu Apple ID. Ative também
   Ajustes › Privacidade e Segurança › Modo de Desenvolvedor (o iPhone reinicia).
4. Com Apple ID grátis o app vale 7 dias; depois é só rodar o comando de novo. Os dados continuam.

No dia a dia, depois de instalado: `npx expo start` e abra o app **Treino e Dieta** (não o Expo Go).
Só precisa repetir o `ios:aparelho` quando entrar um pacote nativo novo.

Android: `npm run android:aparelho` com o celular em modo desenvolvedor e depuração USB.

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
│   └── leitura/             importação por foto/PDF: IA (servidor) ou no aparelho, associação e rascunhos
├── components/              componentes do guia de interface (ui/) e blocos das telas
└── theme/                   tokens.ts e use-theme.ts
```

Os dados ficam só no aparelho, no arquivo `treino-dieta.db` (RNF05). As telas nunca falam com o SQLite direto: chamam as funções de `src/db/`, e `useConsulta` relê os dados sempre que algo é gravado.

Para testar com um histórico pronto, abra **Perfil › Dados de exemplo** (só aparece no modo de desenvolvimento). Lá também dá para apagar tudo e recomeçar do cadastro.

## Leitura de fotos e PDFs

Ficha de treino, dieta, laudo de bioimpedância e tabela nutricional. O resultado vira um rascunho e nada é salvo sem revisão.

- **Com internet:** o arquivo vai para o servidor de leitura (`../servidor`, veja o README de lá) e a IA escolhida em
  Perfil › Leitura de arquivos (Claude, Gemini ou GPT) devolve os dados.
- **Sem internet:** o próprio celular reconhece o texto da foto (Apple Vision / ML Kit) e regras montam o rascunho.
  Só no app instalável e só para fotos de texto impresso; PDF precisa de internet.
- O endereço e a chave do servidor podem ir em `app.json › extra.leitura` ou ser colados na tela de configuração.

## Apple Saúde e Health Connect

Perfil › Apple Saúde (ou Health Connect no Android) conecta o app ao app de saúde do celular, que recebe os dados do relógio.
O app só lê: energia ativa do dia (o gasto do dia passa a usar o relógio, RN11), treinos (corrida, caminhada, bike e outros
viram aeróbicos; musculação do relógio empresta as calorias à sessão do app no mesmo horário), peso e, com o registro do
ciclo ativo, os dias de menstruação. Se uma atividade do relógio coincidir com uma registrada à mão, a aba Treino pergunta
qual vale (RN13). A leitura acontece ao abrir o app e ao voltar para ele (no máximo a cada 10 minutos).
O código fica em `src/lib/saude/` (adaptadores por plataforma + `sincronizar.ts`, que grava no banco).

## O que ainda não funciona no Expo Go

- Apple Saúde e Health Connect: precisam do app instalável.
- Leitura sem internet: precisa do app instalável (no Expo Go só a leitura com IA funciona).

## Regras

- Use só os tokens de `src/theme/tokens.ts`; nada de cores soltas.
- Toda tela usa `<Screen>`: cabeçalho e rodapé fixos, só o meio rola.
- Instale pacotes com `npx expo install <pacote>`, para pegar versões compatíveis com o SDK.
- Antes de cada commit: `npm run typecheck`.
