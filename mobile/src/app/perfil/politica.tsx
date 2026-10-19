import { Documento } from '@/components/Documento';

/** Política de privacidade (LGPD). */
export default function Politica() {
  return (
    <Documento
      titulo="Política de privacidade"
      resumo={['Seus dados ficam só neste aparelho.', 'Nada é vendido nem compartilhado.', 'Você pode exportar ou apagar tudo quando quiser.']}
      secoes={[
        ['1. Quais dados o app guarda', 'Perfil (nome, data de nascimento, sexo, altura e peso), treinos, aeróbicos, dieta e consumo, metas, bioimpedância e, se você ativar, o ciclo menstrual.'],
        ['2. Onde ficam', 'Tudo fica guardado neste aparelho. Nesta versão não existe conta. Com o Apple Saúde ou o Health Connect, os dados trocados ficam no próprio celular.'],
        ['3. Leitura de fotos e PDFs', 'Quando você importa uma ficha, dieta, laudo ou rótulo com internet, o arquivo é enviado ao servidor de leitura e à IA escolhida em Perfil › Leitura de arquivos (Claude, da Anthropic; Gemini, do Google; ou GPT, da OpenAI) apenas para extrair o texto. O servidor do app não guarda o arquivo; cada IA trata os dados conforme a política do seu fornecedor. Sem internet, ou no modo "Só no aparelho", a leitura acontece no próprio celular e nada é enviado.'],
        ['4. Dados de saúde', 'São dados pessoais sensíveis pela LGPD (art. 11). Só são usados com o seu consentimento e apenas para calcular o seu progresso.'],
        ['5. Seus direitos', 'Você pode ver, exportar e apagar seus dados a qualquer momento em Perfil › Privacidade e dados, e retirar o consentimento quando quiser.'],
      ]}
    />
  );
}
