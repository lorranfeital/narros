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
// Corrected: Using client SDK on the server, removing 'firebase-admin'
import { getFirestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  PublishedKnowledge,
  Playbook,
  TrainingModule,
} from '@/lib/firestore-types';
import { getApps } from 'firebase/app';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatWithKnowledgeAssistantInputSchema = z.object({
  query: z.string().describe("The user's natural language question."),
  workspaceId: z.string().describe('The ID of the workspace to get knowledge from.'),
  chatHistory: z.array(ChatMessageSchema).describe('An array of previous messages in the chat.'),
});
export type ChatWithKnowledgeAssistantInput = z.infer<typeof ChatWithKnowledgeAssistantInputSchema>;

const ChatWithKnowledgeAssistantOutputSchema = z.object({
  response: z.string().describe("The AI assistant's answer based on the knowledge base."),
});
export type ChatWithKnowledgeAssistantOutput = z.infer<typeof ChatWithKnowledgeAssistantOutputSchema>;

// This is a private schema, not exported, for the internal prompt
const InternalPromptInputSchema = z.object({
    query: z.string(),
    knowledgeBase: z.array(z.any()).describe('The structured knowledge base as an array of JSON objects.'),
    chatHistory: z.array(ChatMessageSchema),
    workspaceName: z.string(),
})

const prompt = ai.definePrompt({
  name: 'chatWithKnowledgeAssistantPrompt',
  input: { schema: InternalPromptInputSchema },
  output: { schema: ChatWithKnowledgeAssistantOutputSchema },
  prompt: `Você é o assistente de conhecimento da empresa {{{workspaceName}}}. Responda com base exclusivamente nas informações da base de conhecimento abaixo. Seja direto, prático e objetivo. Se não souber, diga que a informação não está na base.\n\nBase de Conhecimento:\n{{{json knowledgeBase}}}\n\nHistórico do Chat:\n{{#each chatHistory}}\n  {{this.role}}: {{this.content}}\n{{/each}}\n\nPergunta do usuário: {{{query}}}`,
});


// Helper to ensure Firebase is ready on the server
function getFlowFirestore() {
  if (getApps().length === 0) {
    // This flow runs on the server and assumes Firebase has been initialized.
    // The project setup should handle this. If not, it's a fatal error.
    throw new Error('Firebase has not been initialized on the server for this Genkit flow.');
  }
  return getFirestore();
}

const chatWithKnowledgeAssistantFlow = ai.defineFlow(
  {
    name: 'chatWithKnowledgeAssistantFlow',
    inputSchema: ChatWithKnowledgeAssistantInputSchema,
    outputSchema: ChatWithKnowledgeAssistantOutputSchema,
  },
  async (input) => {
    // This is where we assemble the knowledge base on the server before calling the prompt.
    const db = getFlowFirestore();

    const workspaceRef = doc(db, 'workspaces', input.workspaceId);
    const publishedKnowledgeRef = doc(db, `workspaces/${input.workspaceId}/published_knowledge`, input.workspaceId);
    const playbooksQuery = query(collection(db, `workspaces/${input.workspaceId}/playbooks`), where('status', '==', 'published'));
    const trainingQuery = query(collection(db, `workspaces/${input.workspaceId}/training_modules`), where('status', '==', 'published'));

    const [
        workspaceSnap,
        publishedKnowledgeSnap,
        playbooksSnap,
        trainingSnap
    ] = await Promise.all([
        getDoc(workspaceRef),
        getDoc(publishedKnowledgeRef),
        getDocs(playbooksQuery),
        getDocs(trainingQuery)
    ]);
    
    const knowledgeBase: any[] = [];
    if (publishedKnowledgeSnap.exists()) {
        knowledgeBase.push(publishedKnowledgeSnap.data() as PublishedKnowledge);
    }
    if (!playbooksSnap.empty) {
        knowledgeBase.push(...playbooksSnap.docs.map(d => d.data() as Playbook));
    }
    if (!trainingSnap.empty) {
        knowledgeBase.push(...trainingSnap.docs.map(d => d.data() as TrainingModule));
    }

    const { output } = await prompt({
        ...input,
        knowledgeBase: knowledgeBase,
        workspaceName: workspaceSnap.data()?.name || 'esta empresa'
    });
    return output!;
  }
);

// This is the exported server action that the client will call.
export async function chatWithKnowledgeAssistant(input: ChatWithKnowledgeAssistantInput): Promise<ChatWithKnowledgeAssistantOutput> {
  return chatWithKnowledgeAssistantFlow(input);
}
