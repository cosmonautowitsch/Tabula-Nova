'use server';

/**
 * @fileOverview A ChatGPT-integrated search flow for the new tab page.
 *
 * - chatGptSearch - A function that handles the search process.
 * - ChatGptSearchInput - The input type for the chatGptSearch function.
 * - ChatGptSearchOutput - The return type for the chatGptSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatGptSearchInputSchema = z.object({
  query: z.string().describe('The search query or question from the user.'),
});
export type ChatGptSearchInput = z.infer<typeof ChatGptSearchInputSchema>;

const ChatGptSearchOutputSchema = z.object({
  answer: z.string().describe('The answer or response from ChatGPT.'),
});
export type ChatGptSearchOutput = z.infer<typeof ChatGptSearchOutputSchema>;

export async function chatGptSearch(input: ChatGptSearchInput): Promise<ChatGptSearchOutput> {
  return chatGptSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatGptSearchPrompt',
  input: {schema: ChatGptSearchInputSchema},
  output: {schema: ChatGptSearchOutputSchema},
  prompt: `You are a helpful assistant integrated into a new tab page.

  The user has entered the following query: {{{query}}}

  Provide a concise and informative answer to the query.
  `,
});

const chatGptSearchFlow = ai.defineFlow(
  {
    name: 'chatGptSearchFlow',
    inputSchema: ChatGptSearchInputSchema,
    outputSchema: ChatGptSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
