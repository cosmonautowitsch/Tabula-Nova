
'use server';

/**
 * @fileOverview A flow to handle Google OAuth 2.0 token exchange.
 * This file is responsible for securely exchanging an authorization code,
 * received from Google after user consent, for an access and refresh token.
 * 
 * - exchangeCodeForToken - Exchanges an authorization code for an access token.
 * - ExchangeCodeInput - The input type for the exchangeCodeForToken function.
 * - ExchangeCodeOutput - The return type for the exchangeCodeForToken function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the token exchange flow.
const ExchangeCodeInputSchema = z.object({
  code: z.string().describe('The authorization code received from Google.'),
});
export type ExchangeCodeInput = z.infer<typeof ExchangeCodeInputSchema>;

// Output schema for the token exchange flow.
// This matches the structure of Google's token response.
const ExchangeCodeOutputSchema = z.object({
    access_token: z.string(),
    expires_in: z.number(),
    refresh_token: z.string().optional(),
    scope: z.string(),
    token_type: z.string(),
});
export type ExchangeCodeOutput = z.infer<typeof ExchangeCodeOutputSchema>;


/**
 * Publicly exported function that can be called from the frontend.
 * It acts as a wrapper around the Genkit flow.
 * @param input The input object containing the authorization code.
 * @returns A promise that resolves to the token data.
 */
export async function exchangeCodeForToken(input: ExchangeCodeInput): Promise<ExchangeCodeOutput> {
  return exchangeCodeFlow(input);
}

// Defines the Genkit flow for handling the token exchange.
const exchangeCodeFlow = ai.defineFlow(
  {
    name: 'exchangeCodeForTokenFlow',
    inputSchema: ExchangeCodeInputSchema,
    outputSchema: ExchangeCodeOutputSchema,
  },
  async ({ code }) => {
    // Retrieve Google OAuth credentials from environment variables.
    // These must be configured on the server for this flow to work.
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // The redirect URI must match the one configured in the Google Cloud Console.
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:9002';


    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Google OAuth credentials are not configured on the server.");
    }

    try {
      // Perform a POST request to Google's token endpoint.
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code", // Specifies that we're exchanging an auth code.
        }),
      });

      const data = await response.json();

      // If the response is not OK, throw an error with the description from Google.
      if (!response.ok) {
        console.error("Error exchanging code for token:", data);
        throw new Error(data.error_description || "Failed to exchange code for token.");
      }

      // Return the token data on success.
      return data as ExchangeCodeOutput;

    } catch (e: any) {
      console.error("Error in exchangeCodeForTokenFlow:", e);
      // Re-throw the error to be handled by the caller.
      throw new Error(`An unexpected error occurred during token exchange: ${e.message}`);
    }
  }
);



