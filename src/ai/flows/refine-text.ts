'use server';
/**
 * @fileOverview A Genkit flow that refines a piece of text based on a specific instruction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineTextInputSchema = z.object({
  textToRefine: z.string().describe('The text to be refined.'),
  refinementType: z
    .enum(['clarify', 'simplify', 'expand', 'summarize'])
    .describe('The type of refinement to perform.'),
});
export type RefineTextInput = z.infer<typeof RefineTextInputSchema>;

const RefineTextOutputSchema = z.object({
  refinedText: z.string().describe('The refined text.'),
});
export type RefineTextOutput = z.infer<typeof RefineTextOutputSchema>;

// This is the exported server action that will be wrapped.
export async function refineTextFlow(
  input: RefineTextInput
): Promise<RefineTextOutput> {
  return _refineTextFlow(input);
}

const prompts = {
  clarify:
    'Você é um editor especialista. Reescreva o texto a seguir para torná-lo mais claro, direto e fácil de entender, sem perder a informação essencial. Mantenha um tom profissional e objetivo. Retorne apenas o texto refinado, sem introduções ou despedidas.',
  simplify:
    'Você é um especialista em comunicação. Simplifique o texto a seguir, usando palavras mais comuns e frases mais curtas. O objetivo é que qualquer pessoa, mesmo sem conhecimento prévio, possa entender o conceito principal. Retorne apenas o texto simplificado, sem introduções ou despedidas.',
  expand:
    'Você é um redator especialista. Expanda o texto a seguir, adicionando mais detalhes, exemplos práticos ou explicações aprofundadas. O objetivo é enriquecer o conteúdo original, tornando-o mais completo e informativo. Retorne apenas o texto expandido, sem introduções ou despedidas.',
  summarize:
    'Você é um especialista em síntese. Resuma o texto a seguir, extraindo apenas as informações mais importantes. O resumo deve ser conciso e capturar a ideia central do texto em poucas frases. Retorne apenas o resumo, sem introduções ou despedidas.',
};

const _refineTextFlow = ai.defineFlow(
  {
    name: 'refineTextFlow',
    inputSchema: RefineTextInputSchema,
    outputSchema: RefineTextOutputSchema,
  },
  async (input) => {
    const systemPrompt = prompts[input.refinementType];

    const response = await ai.generate({
      prompt: `${systemPrompt}\n\nTexto para refinar:\n---\n${input.textToRefine}\n---\n\nTexto refinado:`,
    });

    return { refinedText: response.text };
  }
);
