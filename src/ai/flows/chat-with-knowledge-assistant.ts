'use server';
/**
 * @fileOverview An AI assistant flow that answers questions based on a provided knowledge base and chat history.
 *
 * - chatWithKnowledgeAssistant - A function that handles the AI chat interaction.
 * - ChatWithKnowledgeAssistantInput - The input type for the chatWithKnowledgeAssistant function.
 * - ChatWithKnowledgeAssistantOutput - The return type for the chatWithKnowledgeAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatWithKnowledgeAssistantInputSchema = z.object({
  query: z.string().describe('The user\'s natural language question.'),
  knowledgeBase: z.array(z.any()).describe('The structured knowledge base as an array of JSON objects.'),
  chatHistory: z.array(ChatMessageSchema).describe('An array of previous messages in the chat.'),
  workspaceName: z.string().describe('The name of the workspace.'),
});
export type ChatWithKnowledgeAssistantInput = z.infer<typeof ChatWithKnowledgeAssistantInputSchema>;

const ChatWithKnowledgeAssistantOutputSchema = z.object({
  response: z.string().describe('The AI assistant\'s answer based on the knowledge base.'),
});
export type ChatWithKnowledgeAssistantOutput = z.infer<typeof ChatWithKnowledgeAssistantOutputSchema>;

const prompt = ai.definePrompt({
  name: 'chatWithKnowledgeAssistantPrompt',
  input: { schema: ChatWithKnowledgeAssistantInputSchema },
  output: { schema: ChatWithKnowledgeAssistantOutputSchema },
  prompt: `Você é o assistente de conhecimento da empresa {{{workspaceName}}}. Responda com base exclusivamente nas informações da base de conhecimento abaixo. Seja direto, prático e objetivo. Se não souber, diga que a informação não está na base.\n\nBase de Conhecimento:\n{{{json knowledgeBase}}}\n\nHistórico do Chat:\n{{#each chatHistory}}\n  {{this.role}}: {{this.content}}\n{{/each}}\n\nPergunta do usuário: {{{query}}}`,
});

const chatWithKnowledgeAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithKnowledgeAssistantFlow',
    inputSchema: ChatWithKnowledgeAssistantInputSchema,
    outputSchema: ChatWithKnowledgeAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function chatWithKnowledgeAssistant(input: ChatWithKnowledgeAssistantInput): Promise<ChatWithKnowledgeAssistantOutput> {
  return chatWithKnowledgeAssistantFlow(input);
}
