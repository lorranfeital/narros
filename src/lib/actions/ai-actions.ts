'use server';

import { refineTextFlow, RefineTextInput, RefineTextOutput } from '@/ai/flows/refine-text';

export async function refineText(input: RefineTextInput): Promise<RefineTextOutput> {
    // This is a simple wrapper for now, but could contain more logic, e.g. permission checks
    try {
        return await refineTextFlow(input);
    } catch (error) {
        console.error("[AI Action Error] refineText:", error);
        // Re-throw or return a structured error
        throw new Error("A IA não conseguiu refinar o texto no momento.");
    }
}
