
'use server';
/**
 * @fileOverview A Genkit flow that analyzes raw content and structures it into knowledge categories, operational playbooks, training agendas, and insights.
 *
 * - analyzeAndStructureContent - A function that handles the content analysis and structuring process.
 * - AnalyzeAndStructureContentInput - The input type for the analyzeAndStructureContent function.
 * - AnalyzeAndStructureContentOutput - The return type for the analyzeAndStructureContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeAndStructureContentInputSchema = z.object({
  rawContent: z
    .string()
    .describe(
      'The raw content to be analyzed, which can be a transcription, PDF text, meeting notes, etc.'
    ),
});
export type AnalyzeAndStructureContentInput = z.infer<
  typeof AnalyzeAndStructureContentInputSchema
>;

const BrandKitSchema = z.object({
    colorPalette: z.array(z.object({
        name: z.string().describe("Nome da cor (ex: 'Primária', 'Acento')"),
        hex: z.string().describe("Código hexadecimal da cor (ex: '#FF5733')")
    })).optional().describe("Paleta de cores da marca."),
    typography: z.array(z.object({
        name: z.string().describe("Uso da fonte (ex: 'Títulos', 'Corpo de texto')"),
        family: z.string().describe("Nome da família da fonte (ex: 'Montserrat')"),
        weight: z.string().optional().describe("Peso da fonte (ex: '700', 'Bold')")
    })).optional().describe("Regras de tipografia."),
    toneOfVoice: z.array(z.string()).optional().describe("Lista de adjetivos ou frases que descrevem o tom de voz."),
    sourceRefs: z.array(z.string()).optional().describe("IDs dos documentos de origem."),
}).describe("O Brand Kit estruturado contendo a identidade visual e verbal da marca.");


const AnalyzeAndStructureContentOutputSchema = z.object({
    knowledgeBase: z.array(
        z.object({
            categoria: z.string().describe('Name of the knowledge category'),
            icone: z
                .string()
                .emoji()
                .describe(
                'A simple emoji representing the category (e.g., 📦 💰 👥 ⚙️ 📞 🧾 🔧 📋 🏪 📅)'
                ),
            itens: z.array(
                z.object({
                titulo: z.string().describe('Title of the process or information'),
                descricao: z
                    .string()
                    .describe('A clear, objective, and actionable description in 1-2 sentences.'),
                })
            ),
        })
    ).describe('The structured knowledge base.'),
    brandKit: BrandKitSchema.optional(),
    playbooks: z.array(
        z.object({
            processo: z.string().describe('Name of the operational process'),
            passos: z.array(
                z.object({
                numero: z.number().int().positive().describe('Step number'),
                titulo: z.string().describe('Title of the step'),
                descricao: z.string().describe('What to do in this step'),
                })
            ),
            sourceRefs: z.array(z.string()).optional().describe('IDs of the source documents.'),
        })
    ).describe('A list of operational playbooks.'),
    trainingModules: z.array(
        z.object({
            modulo: z.number().int().positive().describe('Module number'),
            titulo: z.string().describe('Title of the training module'),
            duracao: z.string().describe('Estimated duration (e.g., 30 min)'),
            objetivo: z
                .string()
                .describe('What the employee will be able to do at the end of this module'),
            topicos: z.array(z.string()).describe('List of topics for the module'),
            formato: z
                .enum(['presencial', 'vídeo', 'slides', 'prático'])
                .describe('Suggested format for the training module'),
            sourceRefs: z.array(z.string()).optional().describe('IDs of the source documents.'),
        })
    ).describe('A list of training modules.'),
    insights: z.array(
        z.object({
            texto: z
                .string()
                .describe('Description of the identified gap, opportunity, or risk'),
            tipo: z.enum(['gap', 'oportunidade', 'risco']).describe('Type of insight'),
            sourceRefs: z.array(z.string()).optional().describe('IDs of the source documents.'),
        })
    ).describe('A list of actionable insights.'),
});
export type AnalyzeAndStructureContentOutput = z.infer<
  typeof AnalyzeAndStructureContentOutputSchema
>;

export async function analyzeAndStructureContent(
  input: AnalyzeAndStructureContentInput
): Promise<AnalyzeAndStructureContentOutput> {
  return analyzeAndStructureContentFlow(input);
}

const systemPrompt = `Você é um especialista em estruturação de conhecimento operacional e de marca para franquias e redes de negócios brasileiros. Sua tarefa é analisar o conteúdo bruto fornecido e organizá-lo em uma estrutura JSON clara e acionável.

Siga estas regras estritamente:
1.  **Linguagem Clara e Operacional:** Use português do Brasil. Seja direto, objetivo e prático. Evite jargões desnecessários.
2.  **Não Invente Informações:** Baseie-se exclusivamente no conteúdo fornecido. Se uma informação não estiver presente, não a deduza ou invente.
3.  **Conflitos como Insights:** Se encontrar informações conflitantes, crie um 'insight' do tipo 'risco' descrevendo o conflito.
4.  **Foco nos Ativos de Conhecimento:** Modele o conhecimento para ser usado no dia a dia (processos, checklists, scripts, políticas, guias).
5.  **Saída Estritamente em JSON:** Sua resposta DEVE ser um único objeto JSON válido, sem nenhum texto, comentário ou markdown fora do objeto.

Estruture sua saída nos seguintes blocos:

-   **knowledgeBase:** Organize o conhecimento GERAL e OPERACIONAL em categorias. Cada categoria deve ter um ícone emoji simples e relevante. NÃO inclua informações de marca aqui.
-   **brandKit:** Se o conteúdo contiver diretrizes de marca, identidade visual, tom de voz, posicionamento, personas, paleta de cores, tipografia ou regras de comunicação, extraia essas informações e coloque-as DENTRO do objeto 'brandKit'.
    -   Para 'colorPalette', extraia o nome da cor e seu código hexadecimal.
    -   Para 'typography', extraia o nome de uso (Títulos, Corpo), a família da fonte e o peso.
    -   Para 'toneOfVoice', liste os adjetivos ou princípios (ex: "Amigável", "Formal", "Técnico").
-   **playbooks:** Extraia processos passo a passo.
-   **trainingModules:** Crie módulos de treinamento práticos.
-   **insights:** Identifique gaps, oportunidades ou riscos.

Analise o conteúdo a seguir e retorne a estrutura JSON.`;

const analyzeAndStructureContentPrompt = ai.definePrompt({
  name: 'analyzeAndStructureContentPrompt',
  input: { schema: AnalyzeAndStructureContentInputSchema },
  output: { schema: AnalyzeAndStructureContentOutputSchema, format: 'json' },
  prompt: systemPrompt + '\n\nConteúdo bruto a ser analisado:\n{{{rawContent}}}',
});

const analyzeAndStructureContentFlow = ai.defineFlow(
  {
    name: 'analyzeAndStructureContentFlow',
    inputSchema: AnalyzeAndStructureContentInputSchema,
    outputSchema: AnalyzeAndStructureContentOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeAndStructureContentPrompt(input);
    return output!;
  }
);
