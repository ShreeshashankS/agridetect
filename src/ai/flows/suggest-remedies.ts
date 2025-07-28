'use server';

/**
 * @fileOverview A flow for suggesting specific precautions and remedies for a plant disease.
 *
 * - suggestRemedies - A function that suggests remedies for a plant disease.
 * - SuggestRemediesInput - The input type for the suggestRemedies function.
 * - SuggestRemediesOutput - The return type for the suggestRemedies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRemediesInputSchema = z.object({
  disease: z.string().describe('The name of the identified plant disease.'),
  region: z.string().optional().describe('The region where the plant is located (e.g., city, state, or country).'),
  plantType: z.string().describe('The type of plant affected by the disease (e.g., tomato, rose, oak).'),
});
export type SuggestRemediesInput = z.infer<typeof SuggestRemediesInputSchema>;

const SuggestRemediesOutputSchema = z.object({
  remedies: z.string().describe('Specific precautions and remedies for the identified disease, considering the region.'),
});
export type SuggestRemediesOutput = z.infer<typeof SuggestRemediesOutputSchema>;

export async function suggestRemedies(input: SuggestRemediesInput): Promise<SuggestRemediesOutput> {
  return suggestRemediesFlow(input);
}

const suggestRemediesPrompt = ai.definePrompt({
  name: 'suggestRemediesPrompt',
  input: {schema: SuggestRemediesInputSchema},
  output: {schema: SuggestRemediesOutputSchema},
  prompt: `You are an expert in plant diseases and their remedies. Given the identified disease, plant type, and region, suggest specific precautions and remedies.

Disease: {{{disease}}}
Plant Type: {{{plantType}}}
Region: {{{region}}}

Provide detailed and practical advice, taking into account the local climate and resources available in the specified region, if provided.  If no region is provided, provide general advice applicable to most regions.
`, 
});

const suggestRemediesFlow = ai.defineFlow(
  {
    name: 'suggestRemediesFlow',
    inputSchema: SuggestRemediesInputSchema,
    outputSchema: SuggestRemediesOutputSchema,
  },
  async input => {
    const {output} = await suggestRemediesPrompt(input);
    return output!;
  }
);
