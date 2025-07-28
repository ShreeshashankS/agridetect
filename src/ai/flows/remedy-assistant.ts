'use server';
/**
 * @fileOverview A conversational AI agent for answering follow-up questions about plant remedies.
 *
 * - remedyAssistant - A function that provides conversational answers to user questions.
 * - RemedyAssistantInput - The input type for the remedyAssistant function.
 * - RemedyAssistantOutput - The return type for the remedyAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RemedyAssistantInputSchema = z.object({
  disease: z.string().describe('The name of the diagnosed plant disease.'),
  plantType: z.string().describe('The type of plant affected.'),
  initialRemedy: z.string().describe('The initial remedy that was provided.'),
  question: z.string().describe("The user's follow-up question."),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The history of the conversation so far.'),
});
export type RemedyAssistantInput = z.infer<typeof RemedyAssistantInputSchema>;

const RemedyAssistantOutputSchema = z.object({
  answer: z.string().describe("The AI's conversational answer to the user's question."),
});
export type RemedyAssistantOutput = z.infer<typeof RemedyAssistantOutputSchema>;

export async function remedyAssistant(input: RemedyAssistantInput): Promise<RemedyAssistantOutput> {
  return remedyAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'remedyAssistantPrompt',
  input: {schema: RemedyAssistantInputSchema},
  output: {schema: RemedyAssistantOutputSchema},
  prompt: `You are a friendly and helpful gardening assistant. The user has been given a diagnosis for their plant and has a follow-up question.

Your role is to answer their question based on the context provided. Be conversational and clear in your response.

**Context:**
- Plant Type: {{{plantType}}}
- Diagnosed Disease: {{{disease}}}
- Initial Recommended Remedy: {{{initialRemedy}}}

**Conversation History:**
{{#if conversationHistory}}
  {{#each conversationHistory}}
    {{#if (eq this.role 'user')}}User: {{this.content}}{{/if}}
    {{#if (eq this.role 'model')}}Assistant: {{this.content}}{{/if}}
  {{/each}}
{{/if}}

**User's New Question:**
"{{{question}}}"

Based on this, provide a helpful answer.`,
});

const remedyAssistantFlow = ai.defineFlow(
  {
    name: 'remedyAssistantFlow',
    inputSchema: RemedyAssistantInputSchema,
    outputSchema: RemedyAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
