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

const systemPrompt = `Você é um especialista em estruturação de conhecimento operacional para franquias e redes de negócios brasileiros. Sua tarefa é analisar o conteúdo bruto fornecido e organizá-lo em uma estrutura JSON clara e acionável.

Siga estas regras estritamente:
1.  **Linguagem Clara e Operacional:** Use português do Brasil. Seja direto, objetivo e prático. Evite jargões desnecessários ou linguagem "floreada".
2.  **Não Invente Informações:** Baseie-se exclusivamente no conteúdo fornecido. Se uma informação não estiver presente, não a deduza ou invente.
3.  **Conflitos como Insights:** Se encontrar informações conflitantes entre diferentes partes do conteúdo, não tente resolvê-las. Em vez disso, crie um 'insight' do tipo 'risco' descrevendo o conflito.
4.  **Foco na Operação:** Modele o conhecimento para ser usado no dia a dia de uma empresa real (processos, checklists, scripts, políticas).
5.  **Saída Estritamente em JSON:** Sua resposta DEVE ser um único objeto JSON válido, sem nenhum texto, comentário ou markdown fora do objeto JSON.

Estruture sua saída nos seguintes blocos:

-   **knowledgeBase:** Organize o conhecimento geral em categorias. Cada categoria deve ter um ícone emoji simples e relevante.
-   **playbooks:** Extraia processos passo a passo. Cada passo deve ser claro e numerado.
-   **trainingModules:** Crie módulos de treinamento práticos a partir do conteúdo, sugerindo formato, duração e objetivos.
-   **insights:** Identifique gaps de conhecimento, oportunidades de melhoria ou riscos operacionais.

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
