# Escopo do App de Treino e Dieta

Atualizado em 16/10/2026.

## Visão geral

O app une em um só lugar o registro de treinos de musculação, aeróbicos e alimentação, para quem hoje precisa de dois ou mais apps. Ele deve permitir importar dieta e treino a partir de foto ou PDF, além do cadastro manual.

- **Problema:** os apps atuais fazem bem treino *ou* dieta; poucos juntam histórico de cargas, aeróbicos, macros e micronutrientes.
- **Objetivo:** registrar treinos e alimentação com rapidez, manter histórico e ajudar o usuário a atingir metas.
- **Plataformas:** iOS e Android, com React Native (Expo) e TypeScript.

## Navegação

A navegação principal é uma barra inferior fixa com 5 atalhos, com Início no centro. A ordem, da esquerda para a direita, é: Metas, Treino, Início, Dieta, Perfil.

| Posição | Atalho | Conteúdo |
| --- | --- | --- |
| 1 (esquerda) | Metas | Metas de treino, aeróbico, peso corporal e dieta, com acompanhamento do progresso |
| 2 | Treino | Registro do treino do dia (musculação e aeróbico), plano de treino e histórico |
| 3 (centro) | Início | Tela inicial, aberta por padrão (conteúdo a definir no Figma) |
| 4 | Dieta | Plano alimentar, registro de refeições e balanço do dia |
| 5 (direita) | Perfil | Dados do usuário e configurações |

- **RF01** — O app deve exibir uma barra de navegação inferior com os 5 atalhos acima, visível em todas as telas principais.
- **RF02** — Ao abrir o app, a tela Início deve ser exibida por padrão.
- **RF03** — O atalho da tela atual deve ficar destacado visualmente.

## Identidade visual

A paleta une azul-marinho (seriedade e confiança) com laranja (motivação), seguindo a lógica de combinações de "A Psicologia das Cores", de Eva Heller. Os tons abaixo são para teste no Figma, incluindo contraste e modo escuro.

| Cor | Uso | Claro 3 | Claro 2 | Claro 1 | Base | Escuro 1 | Escuro 2 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Azul-marinho | Base da marca: cabeçalhos, áreas de destaque | #E7EAED | #9FAAB7 | #576A80 | #0F2A4A | #0B2038 | #081525 |
| Azul | Apoio: links, elementos secundários | #E8EEF6 | #A5BDDC | #628CC2 | #1E5AA8 | #16447E | #0F2D54 |
| Laranja | Ação: botão principal, atalho ativo, treino | #FEF0E8 | #FAC4A5 | #F69761 | #F26B1D | #B65016 | #79360E |
| Teal | Dieta | #E7F6F6 | #A1DAD9 | #5ABFBC | #13A3A0 | #0E7A78 | #0A5250 |
| Verde | Status: na meta / dentro da margem | #E8F5EE | #A5D8BD | #62BB8C | #1E9E5A | #167644 | #0F4F2D |
| Âmbar | Status: atenção | #FCF6E6 | #F5D999 | #EDBD4C | #E5A100 | #AC7900 | #725000 |
| Vermelho | Status: alerta / acima do limite | #FBEBEB | #F0B0B0 | #E47575 | #D93A3A | #A32C2C | #6C1D1D |

Claro 3, 2 e 1 = base misturada com 90%, 60% e 30% de branco; Escuro 1 e 2 = base com 25% e 50% de preto.

- **RNF08** — O laranja é usado apenas em elementos de ação e destaque, no máximo um botão principal por tela.
- **RNF09** — Textos sobre cores devem ter contraste mínimo de 4,5:1 (WCAG AA).
- **RNF10** — O app deve ter modo claro e modo escuro.

## Requisitos funcionais

### Treino

- **RF04** — O usuário deve poder cadastrar um plano de treino manualmente, informando os treinos (ex.: A, B, C), exercícios, número de séries e repetições previstas.
- **RF05** — O usuário deve poder importar um plano de treino a partir de uma foto (ex.: ficha em papel).
- **RF06** — O usuário deve poder importar um plano de treino a partir de um arquivo PDF.
- **RF07** — Após a importação por foto ou PDF, o app deve exibir o plano reconhecido para o usuário revisar e corrigir antes de salvar.
- **RF08** — O usuário deve poder marcar um treino como realizado.
- **RF09** — Para cada série realizada, o usuário deve poder registrar a carga (kg) e o número de repetições.
- **RF10** — O app deve manter o histórico de todos os treinos realizados, com data, exercícios, séries, cargas e repetições.
- **RF11** — Durante o registro de um exercício, o app deve exibir a carga e as repetições da última vez em que ele foi feito.

#### Aeróbicos (dentro de Treino)

- **RF24** — O usuário deve poder registrar um aeróbico como parte de um treino ou como sessão isolada.
- **RF25** — Cada aeróbico deve registrar: tipo (ex.: esteira, bicicleta, elíptico, corrida na rua), tempo (min), distância (km) e intensidade. A intensidade pode ser informada de três formas: escala leve/moderada/intensa, percepção de esforço (1–10) ou frequência cardíaca (bpm).
- **RF26** — Para equipamentos de academia, o usuário deve poder registrar a inclinação (esteira) ou a carga/nível (bicicleta).
- **RF27** — Aeróbicos devem entrar no histórico de treinos, junto com a musculação.

#### Integrações de saúde

- **RF44** — O app deve integrar com o Apple Saúde (iOS) e o Health Connect (Android) para importar atividades e calorias gastas.
- **RF45** — Por meio dessas integrações, o app deve receber os dados de smartwatches que gravam nelas (ex.: Apple Watch, Galaxy Watch, Garmin).
- **RF46** — Sem integração ativa, o app deve estimar o gasto de cada atividade registrada manualmente, a partir do tipo, duração, intensidade e peso do usuário (tabela de METs do Compendium of Physical Activities).

### Metas

- **RF12** — O usuário deve poder criar metas e acompanhar o progresso até atingi-las.
- **RF13** — O app deve mostrar o progresso de cada meta com base nos treinos, aeróbicos, pesagens e registros de dieta.
- **RF28** — Meta de carga: atingir uma carga (kg) em um exercício específico.
- **RF29** — Meta de frequência: realizar X treinos de musculação e/ou Y sessões de aeróbico por semana.
- **RF30** — Meta de peso corporal: atingir um peso (kg) alvo.
- **RF31** — O usuário deve poder registrar seu peso corporal com data, para acompanhar a meta de peso.
- **RF32** — Meta de dieta: seguir a dieta à risca por X dias seguidos.
- **RF33** — O usuário deve poder ter várias metas ativas ao mesmo tempo.

### Dieta

- **RF14** — O usuário deve poder cadastrar uma dieta (plano alimentar) manualmente, com refeições, alimentos e quantidades.
- **RF15** — O usuário deve poder importar uma dieta a partir de uma foto (ex.: dieta impressa ou escrita em papel).
- **RF16** — O usuário deve poder importar uma dieta a partir de um arquivo PDF.
- **RF17** — Após a importação por foto ou PDF, o app deve exibir a dieta reconhecida para o usuário revisar e corrigir antes de salvar.
- **RF18** — O usuário deve poder registrar o que comeu marcando refeições ou itens da dieta pré-salva como consumidos.
- **RF19** — O usuário deve poder registrar alimentos avulsos, não previstos na dieta.
- **RF20** — O usuário sem dieta cadastrada deve poder registrar livremente tudo o que comeu no dia.
- **RF21** — Ao fim de cada dia, o app deve exibir o total de calorias ingeridas e o balanço calórico (consumido − gasto).
- **RF34** — O app deve calcular, para cada alimento e para o total do dia, calorias, macronutrientes (proteínas, carboidratos, gorduras, fibras) e micronutrientes (vitaminas e minerais).
- **RF35** — Com dieta cadastrada, a meta diária de calorias deve vir da própria dieta.
- **RF36** — Sem dieta cadastrada, o usuário pode definir uma meta diária de calorias ou deixar sem meta.
- **RF37** — O app deve estimar as calorias gastas no dia para calcular o balanço calórico (ver RN06).
- **RF38** — O usuário deve poder adicionar um alimento lendo o código de barras da embalagem com a câmera, consultando a base Open Food Facts.
- **RF39** — O usuário deve poder adicionar um alimento fotografando a tabela nutricional da embalagem; o app reconhece os valores e o usuário revisa antes de salvar.
- **RF40** — Alimentos adicionados por código de barras ou tabela nutricional ficam salvos na base do usuário para reuso.

### Início e Perfil

- **RF22** — A tela Início terá seu conteúdo definido na etapa de design (Figma).
- **RF23** — A tela Perfil deve exibir e permitir editar os dados do usuário: peso, altura, idade e sexo.
- **RF41** — O Perfil deve ter uma aba de Bioimpedância, onde o usuário registra os resultados de cada exame com data.
- **RF42** — A aba de Bioimpedância deve exibir o histórico de todos os exames registrados, com a evolução de cada medida.
- **RF43** — O app deve calcular a taxa metabólica basal (TMB) do usuário, usada no gasto calórico do dia.
- **RF47** — Cada registro de bioimpedância deve conter: data, peso (kg), circunferência da cintura (cm), IMC, % de gordura corporal, % de músculo esquelético, metabolismo em repouso (kcal), idade biológica (anos) e nível de gordura visceral. Idade, sexo e altura vêm do Perfil.
- **RF48** — O IMC deve ser calculado automaticamente a partir do peso e da altura, sem o usuário precisar digitá-lo.
- **RF49** — O app deve exibir a classificação de cada medida (ex.: Normal, Alto) conforme as tabelas de referência em Regras de negócio.
- **RF50** — O usuário deve poder registrar a bioimpedância por foto ou PDF do laudo, com revisão antes de salvar, além do registro manual.

### Ciclo menstrual

- **RF51** — Usuárias do sexo feminino devem poder ativar, de forma opcional, o registro do ciclo menstrual.
- **RF52** — Cada registro deve conter as datas de início e fim da menstruação, a intensidade do fluxo e sintomas opcionais (ex.: cólica, fadiga, dor de cabeça).
- **RF53** — O app deve estimar a fase atual do ciclo e a data da próxima menstruação a partir dos ciclos registrados.
- **RF54** — A fase do ciclo deve aparecer no registro do treino e no histórico, para a usuária relacionar desempenho (cargas e repetições) com a fase.
- **RF55** — O ciclo deve ser sincronizado com o Apple Saúde e o Health Connect, que têm campos próprios para esses dados.
- **RF64** — Durante a menstruação, o app deve exibir na tela de treino uma mensagem amigável de cuidado, como: "Nesse período lembre-se de se cuidar, suas forças estão menores, portanto pegue leve hoje".

### Notificações e alertas (fora do MVP)

As notificações ficam fora do MVP e entram numa versão posterior.

- **RF56** — Lembrete de treino nos dias e horários definidos pelo usuário.
- **RF57** — Lembrete de refeições nos horários da dieta cadastrada.
- **RF58** — Alerta de meta atingida e de meta próxima do prazo.
- **RF59** — Alerta quando o consumo calórico do dia ultrapassar a margem de ±7% da meta.
- **RF60** — Lembrete para registrar o peso corporal a cada 15 dias e uma nova bioimpedância a cada 3 meses (frequências padrão, ajustáveis pelo usuário).
- **RF61** — Aviso de proximidade da menstruação, para quem ativou o registro do ciclo.
- **RF62** — O usuário deve poder ativar ou desativar cada tipo de notificação e ajustar seus horários.
- **RF63** — As notificações devem ser locais (geradas no próprio aparelho), funcionando sem internet.

## Requisitos não funcionais

- **RNF01** — O app deve funcionar em iOS e Android a partir de um único código (React Native com Expo e TypeScript).
- **RNF02** — O registro de treinos e refeições deve funcionar sem internet, sincronizando quando a conexão voltar.
- **RNF03** — Os dados de saúde são dados sensíveis pela LGPD: o app deve pedir consentimento explícito, ter política de privacidade e permitir que o usuário exclua seus dados.
- **RNF04** — Imagens e PDFs enviados para importação devem ser tratados com a mesma proteção dos demais dados de saúde.
- **RNF05** — No MVP, todos os dados ficam armazenados apenas no aparelho, sem conta nem login.
- **RNF06** — A base de alimentos deve usar a TBCA (Tabela Brasileira de Composição de Alimentos, FoRC/USP) como fonte principal, embarcada no app para funcionar offline. Produtos de marca que não estão na TBCA são cobertos por código de barras e leitura da tabela nutricional (RF38–RF40).
- **RNF07** — A arquitetura de dados deve permitir migrar os dados locais para uma conta na nuvem no lançamento, sem perda de histórico.
- **RNF08 a RNF10** — Ver [Identidade visual](#identidade-visual).

## Regras de negócio

- **RN01** — Nenhum plano importado por foto ou PDF é salvo sem confirmação do usuário, pois o reconhecimento automático pode errar.
- **RN02** — Um treino realizado pode ter séries com cargas e repetições diferentes das previstas no plano; o histórico guarda o que foi de fato feito.
- **RN03** — O balanço diário de calorias soma tudo o que foi registrado no dia: itens da dieta marcados como consumidos e alimentos avulsos.
- **RN04** — Itens da dieta não marcados como consumidos não entram no balanço do dia.
- **RN05** — Meta diária de calorias: se há dieta cadastrada, vale o total da dieta; se não, vale o valor definido pelo usuário; se nenhum, o dia não tem meta.
- **RN06** — Balanço calórico do dia = calorias consumidas − calorias gastas, onde calorias gastas = TMB + gasto das atividades registradas.
- **RN07** — Uma meta de frequência semanal conta treinos de musculação e sessões de aeróbico separadamente, conforme o que a meta definir.
- **RN08** — TMB: se houver bioimpedância registrada com valor de TMB, vale o do exame mais recente; se não, o app calcula pela fórmula de Mifflin-St Jeor, a partir de peso, altura, idade e sexo do Perfil.
- **RN09** — Quando o usuário atualiza o peso (no Perfil, numa pesagem ou numa bioimpedância), a TMB calculada por fórmula é recalculada.
- **RN10** — Um dia conta como "dieta seguida à risca" quando as calorias consumidas ficam dentro de ±7% da meta diária da dieta. A margem vale apenas para as calorias; os macronutrientes não entram nesse critério.
- **RN11** — Gasto de atividades: quando há dado importado do Apple Saúde/Health Connect, ele tem prioridade sobre a estimativa do app.
- **RN12** — Os dados da TBCA podem ser embarcados no app (termos de uso confirmados).
- **RN13** — Duplicidade de atividade: quando uma sessão registrada no app tem horário sobreposto a uma sessão vinda do relógio, o app grava os dados do relógio e pergunta ao usuário se deseja sobrescrevê-los com o que ele registrou. Só se o usuário confirmar, os dados dele substituem os do relógio.
- **RN14** — O valor de metabolismo em repouso da bioimpedância é a TMB usada pela RN08.
- **RN15** — IMC = peso (kg) ÷ altura (m)², classificado pela OMS: abaixo de 18,5 = abaixo do peso; 18,5 a 24,9 = normal; 25 a 29,9 = sobrepeso; 30 ou mais = obeso.
- **RN16** — % de gordura corporal e % de músculo esquelético são classificados por sexo e faixa de idade, conforme as tabelas abaixo (fonte: Omron Healthcare).
- **RN17** — Gordura visceral: até 9 = normal; 10 a 14 = alto; 15 ou mais = muito alto.
- **RN18** — Quando a idade do usuário estiver fora das faixas das tabelas de % de gordura ou % de músculo, o app exibe o valor sem classificação.
- **RN19** — A circunferência da cintura é exibida sem classificação.
- **RN20** — Os dados do ciclo menstrual são visíveis apenas para a usuária. Num futuro compartilhamento com personal ou nutricionista, eles exigem consentimento separado dos demais dados.
- **RN21** — As mensagens sobre o ciclo são apenas sugestões gerais de cuidado: não indicam cargas, percentuais de redução nem fazem afirmações médicas.

#### Classificação do % de gordura corporal

| Sexo | Idade | Baixo (−) | Normal (0) | Alto (+) | Muito alto (++) |
| --- | --- | --- | --- | --- | --- |
| Feminino | 20–39 | < 21,0 | 21,0–32,9 | 33,0–38,9 | ≥ 39,0 |
| Feminino | 40–59 | < 23,0 | 23,0–33,9 | 34,0–39,9 | ≥ 40,0 |
| Feminino | 60–79 | < 24,0 | 24,0–35,9 | 36,0–41,9 | ≥ 42,0 |
| Masculino | 20–39 | < 8,0 | 8,0–19,9 | 20,0–24,9 | ≥ 25,0 |
| Masculino | 40–59 | < 11,0 | 11,0–21,9 | 22,0–27,9 | ≥ 28,0 |
| Masculino | 60–79 | < 13,0 | 13,0–24,9 | 25,0–29,9 | ≥ 30,0 |

#### Classificação do % de músculo esquelético

| Sexo | Idade | Baixo (−) | Normal (0) | Alto (+) | Muito alto (++) |
| --- | --- | --- | --- | --- | --- |
| Feminino | 18–39 | < 24,3 | 24,3–30,3 | 30,4–35,3 | ≥ 35,4 |
| Feminino | 40–59 | < 24,1 | 24,1–30,1 | 30,2–35,1 | ≥ 35,2 |
| Feminino | 60–80 | < 23,9 | 23,9–29,9 | 30,0–34,9 | ≥ 35,0 |
| Masculino | 18–39 | < 33,3 | 33,3–39,3 | 39,4–44,0 | ≥ 44,1 |
| Masculino | 40–59 | < 33,1 | 33,1–39,1 | 39,2–43,8 | ≥ 43,9 |
| Masculino | 60–80 | < 32,9 | 32,9–38,9 | 39,0–43,6 | ≥ 43,7 |

## Fora do escopo / ideias futuras

Ficam para o lançamento, depois do MVP:

- Conta de usuário, login e sincronização dos dados na nuvem.
- Sistema de notificações e alertas (RF56–RF63).
- GIFs de demonstração dos exercícios (o MVP usa as imagens estáticas da Free Exercise DB).

Ideias futuras:

- **Perfil de personal trainer:** o personal cria planos de treino e os envia para seus alunos pelo app, acompanhando os treinos que eles registram.
- **Perfil de nutricionista:** o nutricionista cadastra dietas para seus pacientes, que as recebem direto no app, sem precisar importar foto ou PDF.
- Ambos dependem de conta e login, e exigem que o aluno ou paciente autorize o acesso aos seus dados de saúde (LGPD).

## Fontes

- [TBCA: versão 7, com cerca de 3.500 alimentos (Jornal da USP)](https://jornal.usp.br/?p=268561)
