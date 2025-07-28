'use server';
/**
 * @fileOverview An AI flow to identify a plant from an image.
 *
 * - identifyPlant - A function that handles the plant identification process.
 * - IdentifyPlantInput - The input type for the identifyPlant function.
 * - IdentifyPlantOutput - The return type for the identifyPlant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyPlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyPlantInput = z.infer<typeof IdentifyPlantInputSchema>;

const IdentifyPlantOutputSchema = z.object({
  isPlant: z.boolean().describe('Whether or not the image appears to contain a plant.'),
  commonName: z.string().describe('The common name of the identified plant.').optional(),
  latinName: z.string().describe('The Latin (scientific) name of the identified plant.').optional(),
});
export type IdentifyPlantOutput = z.infer<typeof IdentifyPlantOutputSchema>;

export async function identifyPlant(input: IdentifyPlantInput): Promise<IdentifyPlantOutput> {
  return identifyPlantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyPlantPrompt',
  input: {schema: IdentifyPlantInputSchema},
  output: {schema: IdentifyPlantOutputSchema},
  prompt: `You are an expert botanist. Your task is to identify the plant in the provided image.

If the image contains a plant, set isPlant to true and provide its common and Latin names.
If the image does not appear to contain a plant, set isPlant to false and leave the other fields empty.

Analyze the following image:
{{media url=photoDataUri}}`,
});

const identifyPlantFlow = ai.defineFlow(
  {
    name: 'identifyPlantFlow',
    inputSchema: IdentifyPlantInputSchema,
    outputSchema: IdentifyPlantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
