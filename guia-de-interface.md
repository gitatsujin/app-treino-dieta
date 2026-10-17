# Guia de Interface do App

Atualizado em 16/10/2026.

## Visão geral

Este guia reúne os padrões visuais extraídos das telas do Figma (Início, Treino, Dieta, Metas e Perfil) para serem implementados uma única vez no código e reutilizados em todo o app.

- **Fonte da verdade:** o arquivo [App Treino e Dieta no Figma](https://www.figma.com/design/IMFazHtUnJNYvJ9C1EUVfH), páginas **Telas** e **Componentes**, e a coleção de variáveis **Tema** (modos Claro e Escuro).
- **Base de tela:** 390 × 844 pt (iPhone 14); as telas rolam na vertical e a barra de navegação fica fixa no rodapé.
- **Regra de ouro:** nenhum componente usa cor, tamanho de fonte ou espaçamento soltos no código; tudo vem dos tokens da última seção.

## Cores

São 20 tokens de cor, cada um com um valor para o tema claro e outro para o escuro. O app usa o tema do sistema por padrão, com opção de escolha no Perfil.

| Token (código) | Variável no Figma | Uso | Claro | Escuro |
| --- | --- | --- | --- | --- |
| `background` | cor/bg | Fundo das telas | #F6F8F7 | #0B0D10 |
| `surface` | cor/surface | Cards, barra de navegação, botão secundário | #FFFFFF | #16191E |
| `text` | cor/text | Texto principal | #13201B | #F4F5F6 |
| `textMuted` | cor/textMuted | Legendas, detalhes, valores secundários | #5E6E67 | #9AA3AE |
| `track` | cor/track | Fundo de barras, divisores, chips inativos | #E6ECE9 | #262A31 |
| `accent` | cor/accent | Botão principal, treino, links de ação | #0B8457 | #C6F432 |
| `onAccent` | cor/onAccent | Texto e ícone sobre `accent` | #FFFFFF | #0B0D10 |
| `diet` | cor/diet | Calorias e alimentação | #F59E0B | #FF7A1A |
| `dietStrong` | cor/dietStrong | Ícones e textos da dieta sobre fundo claro | #B45309 | #FF7A1A |
| `protein` | cor/ring2 | Proteína e micronutrientes | #3B82F6 | #38BDF8 |
| `tileTraining` | cor/tileTreino | Fundo de ícones de treino | #E3F4EC | #2A3313 |
| `tileDiet` | cor/tileDieta | Fundo de ícones de dieta, avisos | #FEF3E2 | #3A2414 |
| `navActive` | cor/navActive | Ícone e rótulo da aba ativa | #0B8457 | #C6F432 |
| `navActiveBg` | cor/navActiveBg | Pílula atrás do ícone ativo | #E3F4EC | #23290F |
| `navInactive` | cor/navInactive | Abas inativas | #8A9A93 | #6B7380 |
| `avatar` | cor/avatarBg | Fundo do avatar | #0B8457 | #C6F432 |
| `onAvatar` | cor/onAvatar | Inicial no avatar | #FFFFFF | #0B0D10 |
| `statusFar` | status/longe | Meta abaixo de 40% | #D93A3A | #FF4D4F |
| `statusMid` | status/meio | Meta de 40% a 79% | #E5A100 | #FFB020 |
| `statusNear` | status/perto | Meta a partir de 80%, classificação "Normal" | #1E9E5A | #3DDC84 |

## Tipografia

A fonte é **Inter** em quatro pesos: Regular (400), Medium (500), Semi Bold (600) e Bold (700). No React Native, carregue-a com `@expo-google-fonts/inter`.

| Token | Tamanho / peso | Onde é usado |
| --- | --- | --- |
| `display` | 30 / Bold | Número principal (ex.: "1.640" kcal) |
| `screenTitle` | 28 / Bold | Título das telas (Treino, Dieta, Metas, Perfil) |
| `greeting` | 24 / Bold | Saudação da tela Início |
| `value` | 18 / Bold | Valores em cards de indicador (peso, balanço) |
| `cardTitle` | 17 / Semi Bold | Título de card e de seção |
| `itemTitle` | 15–16 / Semi Bold | Nome de treino, refeição, exercício, meta |
| `button` | 14 / Semi Bold | Rótulo de botões |
| `body` | 14 / Regular | Textos de apoio, subtítulo de tela |
| `bodySmall` | 13 / Regular | Detalhes, mensagens, listas de alimentos (altura de linha 140%) |
| `caption` | 12 / Regular ou Medium | Legendas, rótulos de indicadores, datas |
| `label` | 11 / Semi Bold | Etiquetas e rótulos da barra de navegação |

Textos de valores secundários (ex.: "/ 2.300 kcal") usam a cor `textMuted`; nunca reduza a opacidade do texto para obter o tom mais claro.

## Espaçamento, cantos e layout

O espaçamento segue uma escala curta, de 2 em 2 até 20; os cantos são sempre arredondados, e mais arredondados quanto maior o bloco.

| Token | Valor | Onde é usado |
| --- | --- | --- |
| `space.xxs` | 2 | Entre título e subtítulo |
| `space.xs` | 4–6 | Entre rótulo, valor e barra |
| `space.sm` | 8 | Entre botões, entre ícone e texto em pílulas |
| `space.md` | 10 | Entre cards na tela |
| `space.lg` | 12 | Entre elementos dentro de um card; ícone e texto |
| `space.xl` | 16 | Padding interno dos cards; margem lateral da tela |
| `space.xxl` | 20 | Margem lateral do topo da tela |
| `radius.bar` | 4 | Barras de progresso (8 de altura) |
| `radius.tag` | 8 | Etiquetas ("Normal", "Aeróbico") |
| `radius.tile` | 30% do lado | Quadrado de ícone (ex.: 13 para 44) |
| `radius.button` | 14 | Botões |
| `radius.shortcut` | 16 | Cards de atalho e avisos |
| `radius.chip` | 18 | Chips de filtro |
| `radius.card` | 20 | Cards |
| `radius.full` | 50% | Avatar, círculos dos dias, pílula da aba ativa |

**Estrutura de toda tela:** topo (hora, título e ação à direita, margens de 20) → conteúdo (cards empilhados com 10 de espaço e margens de 16) → barra de navegação fixa. Cards ocupam a largura toda; lado a lado, só em linhas de 2 (indicadores) ou 3 (atalhos).

## Componentes

São 41 blocos que se repetem nas telas; cada um vira um componente no código, com as props indicadas. A primeira tabela cobre as telas principais; a segunda, os formulários e as telas internas.

| Componente | Props / variações | Especificação | Onde aparece |
| --- | --- | --- | --- |
| `Button` | `variant`: primary · secondary · danger; `label`; `icon?`; `onPress` | Altura 44, canto 14, padding lateral 16, texto `button` com reticências se não couber. Primário: fundo `accent`, texto `onAccent`. Secundário: fundo `surface`, contorno 1,5 `accent`, texto `accent`. Perigo: fundo `surface`, contorno 1,5 `statusFar`, texto e ícone (`Trash2` 18) em `statusFar`, largura total. Perigo confirmado (só dentro do `ConfirmDialog`): fundo `statusFar`, texto `onAccent` | Todos os cards com ação |
| `ButtonRow` | `secondary`, `primary` | Secundário com largura fixa de 112 à esquerda, primário ocupa o resto; espaço 8 | Treino de hoje, próxima refeição |
| `ScreenHeader` | `title`, `subtitle?`, `action?` | Título `screenTitle`, subtítulo `body` `textMuted`, ação: círculo de 44 com ícone | Topo de todas as telas |
| `Card` | `children`, `gap?` | Fundo `surface`, canto 20, padding 16, espaço interno 12 | Base de quase todos os blocos |
| `SectionHeader` | `title`, `actionLabel?` | Título `cardTitle`; ação em `accent` 13 Semi Bold à direita | "Histórico recente", "Refeições de hoje" |
| `IconTile` | `icon`, `tone`: training · diet · neutral; `size`: 28 · 32 · 36 · 40 · 44 | Quadrado com canto de 30% do lado, ícone com metade do tamanho | Cards, atalhos, listas |
| `ShortcutCard` | `icon`, `label`, `tone` | Card com padding 12 e canto 16, `IconTile` 36 + texto `caption`, centralizados; sempre em linhas de 3 | Atalhos rápidos |
| `StatCard` | `icon`, `label`, `value`, `detail` | Card com padding 14, `IconTile` 32, valor `value`; em linhas de 2 | Peso, balanço, TMB |
| `ListRow` | `leading`, `title`, `subtitle`, `trailing?` | Ícone ou data à esquerda, título `itemTitle`, subtítulo `caption`; divisores de 1 em `track` entre linhas | Exercícios, histórico, configurações |
| `ProgressBar` | `value`, `max`, `color?` | Altura 8, canto 4, trilho `track`. Sem `color`, usa a cor de status (ver Regras de uso) | Metas, macros, micronutrientes |
| `ActivityRings` | `rings`: [{valor, máx, cor}] | Três anéis concêntricos, raios 50/36/22, traço 10 com ponta redonda, tamanho 112 | Card "Seu dia" |
| `Chip` | `label`, `selected` | Canto 18, padding 14 × 8, texto 13 Semi Bold. Selecionado: fundo `accent`; inativo: `surface` com contorno `track` | Filtros de metas, treinos A/B/C |
| `Tag` | `label`, `tone` | Canto 8, padding 8 × 3, texto `label` | "Normal", "Aeróbico", "Concluída" |
| `Banner` | `icon`, `message`, `actionLabel` | Fundo `tileDiet`, canto 16, padding 14 × 12, ação em `dietStrong` | Avisos contextuais no topo da Início |
| `WeekStrip` | `days`: [{dia, treinou, dietaOk}] | 7 círculos de 36: treino = `accent`; hoje = contorno `accent`; ponto de 6 em `diet` se a dieta ficou na meta | Card "Sua semana" |
| `TabBar` | `active`: metas · treino · início · dieta · perfil | Fundo `surface`, borda superior `track`, ícone 22 numa pílula 56 × 30 (`navActiveBg` quando ativa), rótulo `label` | Rodapé de todas as telas |

### Formulários e telas internas

| Componente | Props / variações | Especificação | Onde aparece |
| --- | --- | --- | --- |
| `TopBar` | `title`, `subtitle?`, `leading`: back · close; `actionLabel?` | Botão circular de 40 (fundo `surface`) à esquerda, título `cardTitle` centralizado, ação em `accent` 15 Semi Bold à direita; laterais com 76 de largura para manter o título no centro | Todas as telas internas |
| `BottomActionBar` | `primary`, `secondary?` | Fundo `surface`, borda superior de 1 em `track`, padding 16 (28 embaixo); contém um `ButtonRow` ou um `Button` primário de largura total. Fica fixa no rodapé | Telas internas com ação de salvar |
| `TextField` | `label?`, `value`, `placeholder?`, `unit?`, `leadingIcon?`, `trailingIcon?`, `state`: default · focused · readonly · warning | Altura 48 (40 na versão compacta), canto 12, padding 14. Padrão: fundo `surface`, borda 1 `track`. Em foco: borda 1,5 `accent`. Somente leitura: fundo `track`. Atenção (valor lido com pouca confiança): borda 1,5 `dietStrong`, rótulo em `dietStrong` e ícone `TriangleAlert` 16 à direita. Rótulo `caption` Medium `textMuted` acima, unidade em `textMuted` à direita | Formulários de perfil, aeróbico, bioimpedância, peso, metas |
| `FieldRow` | `children` | Dois ou três `TextField` lado a lado, espaço 10 (8 na versão compacta) | Altura e peso, carga atual e alvo |
| `SearchField` | `value`, `onClear` | `TextField` em foco com ícone `Search` à esquerda e `X` à direita | Adicionar alimento |
| `SegmentedControl` | `options`, `selected` | Trilho `track` com canto 12 e padding 4; opção ativa com fundo `surface`, canto 9, texto 13 Semi Bold `text`; inativas em 13 Medium `textMuted` | Sexo, intensidade, períodos do gráfico, vitaminas/minerais |
| `ChipGroup` | `options`, `selected` (um ou vários), `wrap` | `Chip` com quebra de linha automática, espaço 8 nas duas direções | Tipo de aeróbico, objetivo, sintomas |
| `Checkbox` | `checked` | Quadrado de 24, canto 7. Marcada: fundo `accent` com `Check` 16 em `onAccent`. Vazia: borda 1,5 `textMuted` | Consentimentos (LGPD) |
| `Toggle` | `value` | 44 × 26, canto 13, bolinha de 20. Ligado: trilho `accent`, bolinha `onAccent`. Desligado: trilho `track`, bolinha `surface` | Permissões, integrações, vincular aeróbico |
| `Stepper` | `onDecrement`, `onIncrement` | Dois quadrados de 48, canto 12, fundo `track`, ícones `Minus` e `Plus` em `text` | Quantidade de alimento |
| `ProgressSteps` | `step`, `total` | Texto "Passo X de Y" em `caption` e segmentos de 4 de altura (canto 2): concluídos em `accent`, restantes em `track` | Boas-vindas, consentimento, Apple Saúde |
| `NutrientBox` | `label`, `value` | Fundo `track`, canto 12, padding 10 vertical; valor 15 Bold `text` e rótulo 11 Medium `textMuted`, centralizados; em linhas de 3 ou 4 | Alimento selecionado, produto escaneado |
| `SetRow` | `index`, `weight`, `reps`, `state`: done · current · next | Círculo de 36 com o número, dois campos compactos (40 de altura) e caixa de 40 para marcar. Feita: campos em `track` e caixa `accent` com check. Atual: campos com borda `accent` | Treino em andamento |
| `SelectCard` | `icon`, `title`, `description`, `selected` | `Card` com padding 14, `IconTile` 36, título 15 Semi Bold e descrição `caption`; selecionado com borda 2 `accent`; em grade de 2 colunas | Tipo de meta |
| `CalendarMonth` | `month`, `today`, `marked`: [{dia, tipo}] | Cabeçalho com mês e setas; 7 colunas de 38; hoje com fundo `accent`; previsão com contorno tracejado `dietStrong` | Ciclo menstrual |
| `LineChart` | `data`, `range` | Linha de 2,5 em `accent` com ponta redonda, grade horizontal em `track`, rótulos 11 `textMuted`, ponto final de 10 com borda `surface`. Sugestão: `react-native-svg` ou `victory-native` | Evolução do peso |
| `CameraScanner` | `mode`: barcode · label | Área da câmera com canto 20, moldura de cantos brancos (traço 4), linha de leitura em `accent`, instrução em branco 14 Medium, botão de flash; o fundo da câmera é sempre escuro nos dois temas | Escanear alimento |
| `CounterRow` | `label`, `caption`, `value`, `min?`, `max?` | Linha com título 15 Medium e legenda `caption` à esquerda; à direita, botões de 40 (canto 12, fundo `track`, ícones `Minus`/`Plus`) com o valor 20 Bold centralizado entre eles (28 de largura) | Nova meta · Frequência (treinos e aeróbicos por semana) |
| `ComparisonTable` | `columns`, `rows` | Dentro de um `Card`; cabeçalho 11 Medium `textMuted`; primeira coluna 13 Medium `textMuted` ocupando o espaço livre; demais colunas com 58 de largura, 13 Semi Bold `text`, alinhadas à direita; divisores de 1 em `track`, linhas com padding 10 vertical | Evolução da bioimpedância (comparação dos exames) |
| `Radio` | `selected` | Círculo de 22. Marcado: borda 2 `accent` com ponto de 10 `accent`. Vazio: borda 1,5 `textMuted`. Usado no fim de um `ListRow`; opção indisponível fica com opacidade 45% | Tema, meta de calorias |
| `BottomSheet` | `title`, `children`, `onClose` | Fundo escurecido (preto 55%) sobre a tela; folha `surface` presa embaixo, cantos superiores 24, alça 36 × 4 em `track`, padding 16 (28 embaixo), espaço 14 | Editar item consumido, Sair do treino (pausar, finalizar ou continuar; nunca descarta o que foi feito) |
| `BarChart` | `data`, `range` | Barras de 24 com cantos superiores 6; dentro da meta em `statusNear`, fora em `statusMid`; faixa da meta (±7%) em `track` atrás das barras; rótulos 11 `textMuted` | Histórico da dieta |
| `ConfirmDialog` | `title`, `message`, `confirmLabel`, `onConfirm` | Fundo escurecido (preto 55%); caixa `surface` de 342 centralizada, canto 24, padding 20 (24 em cima); `IconTile` 52 com `Trash2` em `statusFar` sobre `track`, título 19 Bold, mensagem 14 `textMuted` centralizada; botões Cancelar (secundário, 112) + confirmar (perigo preenchido) | Excluir meta, excluir dados, desconectar, remover do dia, descartar importação |
| `CyclePhaseTag` | `phase`: menstrual · folicular · lutea · ovulatoria; `day?` | Variação do `Tag`: menstrual em `tileDiet` + `dietStrong`; folicular em `tileTraining` + `accent`; lútea e ovulatória em `track` + `textMuted`. Só aparece para quem ativou o ciclo | Aba Treino, treino em andamento, histórico e detalhe da sessão (RF54) |
| `InfoBanner` | `icon`, `message`, `tone`: warning · info | Variação do `Banner`: aviso usa `tileDiet` + `dietStrong`; informação usa `track` + `textMuted` | Revisão de importação, privacidade, dicas |

## Mapa de telas

O Figma tem 74 telas, todas em tema claro e escuro, organizadas na página **Telas** em um quadro por área, na ordem do fluxo. As telas marcadas com "· ciclo" ou "· menstruação" são as versões para quem ativou o registro do ciclo menstrual.

| Área | Telas |
| --- | --- |
| Entrada no app (3) | Boas-vindas e perfil, Consentimento de dados, Conectar Apple Saúde |
| Início (3) | Início, Início · primeiro dia, Início · treino pausado |
| Treino (19) | Treino, Treino de hoje, Treino · menstruação, Treino sem plano, Treino em andamento, Treino em andamento · ciclo, Sair do treino, Treino concluído, Registrar aeróbico, Atividade duplicada, Histórico de treinos, Histórico de treinos · ciclo, Detalhe da sessão, Detalhe da sessão · ciclo, Evolução do exercício, Importar ficha, Editar plano de treino, Escolher exercício, Criar exercício |
| Dieta (19) | Dieta, Dieta de hoje, Detalhe da refeição, Detalhe da refeição · pendente, Dieta sem plano, Adicionar alimento, Escanear alimento, Escanear tabela nutricional, Revisar tabela nutricional, Produto não encontrado, Cadastrar alimento, Editar item consumido, Micronutrientes, Histórico da dieta, Editar dieta, Importar dieta, Origem da importação, Lendo arquivo, Erro na leitura |
| Metas (12) | Metas, Nova meta (Carga, Frequência, Peso corporal, Dieta), Detalhe da meta (Carga, Frequência, Peso corporal, Dieta), Confirmar exclusão, Meta atingida, Metas concluídas |
| Perfil (18) | Perfil, Editar perfil, Registrar peso, Registrar bioimpedância, Revisar laudo, Evolução da bioimpedância, Ciclo menstrual, Registrar menstruação, Apple Saúde, Tema, Unidades, Meta de calorias, Privacidade e dados, Exportar meus dados, Exportação pronta, Política de privacidade, Termos de uso, Sobre o app |

Casos que reaproveitam telas existentes: editar uma sessão passada (layout do Treino em andamento), editar uma meta (Nova meta preenchida), editar quantidade no Editar dieta (mesmo `BottomSheet` do Editar item consumido), Health Connect no Android (telas do Apple Saúde com outro nome) e exportar dados (tela de compartilhar do sistema).

Fica para depois: as telas de notificações (RF56–RF63), fora do escopo do MVP.

## Ícones

Os ícones são de traço (contorno), com traço 2, pontas arredondadas e grade de 24. A biblioteca **lucide-react-native** tem esse mesmo estilo e cobre quase todos; o ícone de Metas (alvo com bandeira) foi desenhado no Figma e deve ser exportado como SVG.

| Uso | Ícone sugerido (Lucide) | Tamanho |
| --- | --- | --- |
| Aba Metas | SVG próprio (exportar da página Componentes) | 22 |
| Aba Treino, treino | `Dumbbell` | 22 |
| Aba Início | `House` | 22 |
| Aba Dieta, refeição | `Utensils` | 22 |
| Aba Perfil | `User` | 22 |
| Adicionar | `Plus` | 22 |
| Escanear código de barras | `ScanBarcode` | 18 |
| Importar por foto | `Camera` | 18 |
| Peso | `Weight` | 16–20 |
| Balanço, TMB, sequência | `Flame` | 14–16 |
| Aeróbico | `Footprints` | 14–18 |
| Histórico | `Clock` | 18 |
| Frequência | `Calendar` | 20 |
| Recorde, meta concluída | `Trophy` | 20 |
| Consumida, concluído | `Check` | 18–20 |
| Integração de saúde | `Heart` | 20 |
| Configurações | `Settings`, `Moon`, `Ruler`, `Lock`, `Download`, `Info` | 20 |
| Navegação em listas | `ChevronRight` | 16–18 |

Nas telas internas também aparecem: `Search`, `X`, `Minus`, `ChevronLeft`, `Zap` (flash), `TriangleAlert` (revisar), `FileText` (PDF), `Watch` (relógio), `Droplet` (ciclo), `GripVertical` (arrastar), `Trash2` (remover) e `Link` (vincular).

Dentro de um `IconTile`, o ícone usa a cor forte do tom (`accent` ou `dietStrong`) sobre o fundo claro do mesmo tom (`tileTraining` ou `tileDiet`).

## Regras de uso

1. **Um botão principal por card.** Ação principal = `Button` primário; ação de apoio = secundário à esquerda, via `ButtonRow`.
2. **Cor de progresso por status (RNF11).** Barra de meta abaixo de 40% = `statusFar`; de 40% a 79% = `statusMid`; a partir de 80% = `statusNear`. Calcule a cor no componente a partir do valor, nunca fixe no layout.
3. **Cores por domínio.** Treino usa `accent` e `tileTraining`; dieta e calorias usam `diet`, `dietStrong` e `tileDiet`; proteína e micronutrientes usam `protein`.
4. **Classificação da bioimpedância.** "Normal" usa `statusNear`, "Alto" usa `statusMid` e "Muito alto" ou "Baixo" usa `statusFar`; sem classificação (RN18, RN19), mostre só o valor.
5. **Textos humanos.** Cards de progresso terminam com uma frase de orientação em `bodySmall` (ex.: "Falta 1 treino para bater a meta da semana").
6. **Nada sai da tela.** Rótulos de botão e títulos de uma linha usam reticências; textos longos quebram linha com largura total do card.
7. **Contraste mínimo de 4,5:1 (RNF09).** Já garantido pelos pares `accent`/`onAccent` e `text`/`surface` nos dois temas; ao criar novos pares, verifique.
8. **Ações destrutivas.** Usam o `Button` de perigo, ficam no último card da tela, sempre com um texto explicando o que será apagado, e pedem confirmação antes de executar.
9. **Rodapé fixo só em telas de ação.** O `BottomActionBar` aparece onde a pessoa precisa concluir algo (salvar, criar, iniciar). Telas de consulta, como o detalhe de uma sessão, não têm rodapé fixo: a ação de editar fica no canto superior direito do `TopBar` e as outras ações ficam no fim do conteúdo (secundário em cima), seguidas de um `Button` primário "OK" que volta para a tela anterior.
10. **Atalhos da Início abrem por cima.** Um botão da Início que mostra conteúdo de outra aba ("Ver treino" abre Treino de hoje; "Ver dieta" abre Dieta de hoje) abre uma tela que sobe de baixo, com `X` no `TopBar` para fechar e voltar à Início, em vez de trocar de aba.
11. **Fim do treino volta para a Início.** Em Treino concluído, tanto "Concluir" quanto o `X` levam à Início, de onde quer que o treino tenha começado; a tela não volta para o treino já encerrado.
12. **Cabeçalho e rodapé fixos.** Só o conteúdo rola: o `TopBar` (ou o cabeçalho das abas) fica preso no topo com fundo `background`, e o `BottomActionBar` ou a `TabBar` ficam presos embaixo. No código: cabeçalho e rodapé fora do `ScrollView`, dentro de um `SafeAreaView`.
13. **Fechar a câmera volta para a Início.** Nas telas de escanear (código de barras e tabela nutricional), o `X` leva à Início, de onde quer que a câmera tenha sido aberta.
14. **Cards condicionais.** Aviso (`Banner`), recorde pessoal, ciclo menstrual e relógio só aparecem quando há dado para mostrar.

## Tokens em código (TypeScript)

Ponto de partida para `src/theme/tokens.ts`: os componentes leem o tema ativo com `useColorScheme()` e usam só estes valores.

```typescript
export const colors = {
  light: {
    background: '#F6F8F7', surface: '#FFFFFF', text: '#13201B', textMuted: '#5E6E67',
    track: '#E6ECE9', accent: '#0B8457', onAccent: '#FFFFFF',
    diet: '#F59E0B', dietStrong: '#B45309', protein: '#3B82F6',
    tileTraining: '#E3F4EC', tileDiet: '#FEF3E2',
    navActive: '#0B8457', navActiveBg: '#E3F4EC', navInactive: '#8A9A93',
    avatar: '#0B8457', onAvatar: '#FFFFFF',
    statusFar: '#D93A3A', statusMid: '#E5A100', statusNear: '#1E9E5A',
  },
  dark: {
    background: '#0B0D10', surface: '#16191E', text: '#F4F5F6', textMuted: '#9AA3AE',
    track: '#262A31', accent: '#C6F432', onAccent: '#0B0D10',
    diet: '#FF7A1A', dietStrong: '#FF7A1A', protein: '#38BDF8',
    tileTraining: '#2A3313', tileDiet: '#3A2414',
    navActive: '#C6F432', navActiveBg: '#23290F', navInactive: '#6B7380',
    avatar: '#C6F432', onAvatar: '#0B0D10',
    statusFar: '#FF4D4F', statusMid: '#FFB020', statusNear: '#3DDC84',
  },
} as const;

export type ThemeColors = typeof colors.light;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.bold, fontSize: 30 },
  screenTitle: { fontFamily: font.bold, fontSize: 28 },
  greeting: { fontFamily: font.bold, fontSize: 24 },
  value: { fontFamily: font.bold, fontSize: 18 },
  cardTitle: { fontFamily: font.semibold, fontSize: 17 },
  itemTitle: { fontFamily: font.semibold, fontSize: 15 },
  button: { fontFamily: font.semibold, fontSize: 14 },
  body: { fontFamily: font.regular, fontSize: 14 },
  bodySmall: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12 },
  label: { fontFamily: font.semibold, fontSize: 11 },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 10, lg: 12, xl: 16, xxl: 20 } as const;

export const radius = {
  bar: 4, tag: 8, button: 14, shortcut: 16, chip: 18, card: 20, full: 999,
} as const;

export const size = { button: 44, tabIcon: 22, iconTile: 44, ring: 112 } as const;

/** Cor da barra de meta conforme o progresso (RNF11). */
export const statusColor = (progress: number, c: ThemeColors) =>
  progress >= 0.8 ? c.statusNear : progress >= 0.4 ? c.statusMid : c.statusFar;
```
