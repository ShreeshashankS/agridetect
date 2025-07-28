'use server';

/**
 * @fileOverview A plant disease diagnosis AI agent.
 *
 * - diagnoseDisease - A function that handles the plant disease diagnosis process.
 * - DiagnoseDiseaseInput - The input type for the diagnoseDisease function.
 * - DiagnoseDiseaseOutput - The return type for the diagnoseDisease function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnoseDiseaseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DiagnoseDiseaseInput = z.infer<typeof DiagnoseDiseaseInputSchema>;

const DiagnoseDiseaseOutputSchema = z.object({
  diseaseDiagnoses: z.array(
    z.object({
      diseaseName: z.string().describe('The name of the diagnosed disease.'),
      confidenceScore: z.number().describe('The confidence score for the diagnosis (0-1).'),
      reason: z.string().describe('Reasoning behind the model\'s diagnosis.'),
      precaution: z.string().describe('Precaution measures for the diagnosed disease.'),
      remedy: z.string().describe('Remedies for the diagnosed disease.'),
    })
  ).describe('List of potential diseases and confidence scores.'),
});
export type DiagnoseDiseaseOutput = z.infer<typeof DiagnoseDiseaseOutputSchema>;

export async function diagnoseDisease(input: DiagnoseDiseaseInput): Promise<DiagnoseDiseaseOutput> {
  return diagnoseDiseaseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnoseDiseasePrompt',
  input: {schema: DiagnoseDiseaseInputSchema},
  output: {schema: DiagnoseDiseaseOutputSchema},
  prompt: `You are an expert in plant pathology. Given an image of a plant, you will identify potential diseases affecting the plant and provide a confidence score for each diagnosis.

  Analyze the following plant image:
  {{media url=photoDataUri}}

  Provide a diagnosis for potential plant diseases, a confidence score (0-1) for each diagnosis, the reasoning behind your diagnosis, precaution measures and remedies.
  Ensure that the diseaseDiagnoses are returned as an array of disease objects.`, config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const diagnoseDiseaseFlow = ai.defineFlow(
  {
    name: 'diagnoseDiseaseFlow',
    inputSchema: DiagnoseDiseaseInputSchema,
    outputSchema: DiagnoseDiseaseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
