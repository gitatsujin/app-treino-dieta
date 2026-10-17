import { Documento } from '@/components/Documento';

/** Termos de uso. */
export default function Termos() {
  return (
    <Documento
      titulo="Termos de uso"
      resumo={['O app é gratuito e funciona sem conta.', 'Ele não substitui médico, nutricionista ou educador físico.', 'Você é responsável pelo que registra.']}
      secoes={[
        ['1. Para que serve', 'Registrar treinos, aeróbicos, dieta e medidas e acompanhar suas metas, para uso pessoal.'],
        ['2. Informações de saúde', 'Calorias, TMB, classificações da bioimpedância e mensagens sobre o ciclo são estimativas e sugestões gerais. Antes de mudar treino ou dieta, procure um profissional.'],
        ['3. Dados de alimentos', 'Os valores vêm da TBCA e do Open Food Facts e podem conter erros. Alimentos e exercícios que você cadastra ficam sob sua responsabilidade.'],
        ['4. Mudanças nos termos', 'Se estes termos mudarem, o app avisa na próxima vez em que for aberto, antes de você continuar.'],
      ]}
    />
  );
}
