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
  empresa: z.object({
    nome: z
      .string()
      .describe("Identified company name or 'Não identificado'"),
    tipo: z
      .enum(['franquia', 'escritório', 'rede', 'outro'])
      .describe('Type of business: franchise, office, network, or other'),
    setor: z.string().describe('Sector of the business'),
  }),
  base_conhecimento: z.array(
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
  ),
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
    })
  ),
  pauta_treinamento: z.array(
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
    })
  ),
  insights: z.array(
    z.object({
      texto: z
        .string()
        .describe('Description of the identified gap, opportunity, or risk'),
      tipo: z.enum(['gap', 'oportunidade', 'risco']).describe('Type of insight'),
    })
  ),
});
export type AnalyzeAndStructureContentOutput = z.infer<
  typeof AnalyzeAndStructureContentOutputSchema
>;

export async function analyzeAndStructureContent(
  input: AnalyzeAndStructureContentInput
): Promise<AnalyzeAndStructureContentOutput> {
  return analyzeAndStructureContentFlow(input);
}

const systemPrompt = `Você é um especialista em estruturação de conhecimento operacional para franquias e redes de negócios brasileiros.\n\nAo receber conteúdo bruto (transcrições, PDFs, reuniões, anotações), você deve:\n1. Identificar o tipo de negócio e setor\n2. Extrair e organizar o conhecimento em categorias com ícones emoji simples (📦 💰 👥 ⚙️ 📞 🧾 🔧 📋 🏪 📅)\n3. Gerar playbooks operacionais com passos numerados para os processos identificados\n4. Gerar pauta de treinamento com módulos práticos, duração estimada e formato sugerido\n5. Identificar gaps de conhecimento, oportunidades e riscos operacionais\n\nResponda APENAS em JSON válido, sem markdown, sem texto fora do JSON.\n`;

const analyzeAndStructureContentPrompt = ai.definePrompt({
  name: 'analyzeAndStructureContentPrompt',
  input: { schema: AnalyzeAndStructureContentInputSchema },
  output: { schema: AnalyzeAndStructureContentOutputSchema, format: 'json' },
  prompt: systemPrompt + 'Conteúdo bruto a ser analisado:\n{{{rawContent}}}',
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
