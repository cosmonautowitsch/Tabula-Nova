
'use server';

/**
 * @fileOverview A flow to fetch data from the Gmail API.
 * 
 * - listEmails - Lists the user's recent emails.
 * - getEmail - Fetches the content of a single email.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GmailMessageSchema, GmailMessagePartSchema, type GmailMessage } from '@/types';

const BASE_URL = "https://www.googleapis.com/gmail/v1/users/me/messages";

// --- Schemas ---

const AuthInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});

const ListEmailsOutputSchema = z.array(z.object({
  id: z.string(),
  threadId: z.string(),
}));

const GetEmailInputSchema = AuthInputSchema.extend({
  emailId: z.string(),
});
const GetEmailOutputSchema = GmailMessageSchema;


// --- Public Functions ---

export async function listEmails(accessToken: string): Promise<{ id: string, threadId: string }[]> {
  return listEmailsFlow({ accessToken });
}

export async function getEmail(accessToken: string, emailId: string): Promise<GmailMessage> {
  return getEmailFlow({ accessToken, emailId });
}


// --- Flows ---

const listEmailsFlow = ai.defineFlow(
  {
    name: 'listEmailsFlow',
    inputSchema: AuthInputSchema,
    outputSchema: ListEmailsOutputSchema,
  },
  async ({ accessToken }) => {
    // Fetches the most recent 5 emails.
    const response = await fetch(`${BASE_URL}?maxResults=5`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gmail list messages failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return data.messages || [];
  }
);


const getEmailFlow = ai.defineFlow(
  {
    name: 'getEmailFlow',
    inputSchema: GetEmailInputSchema,
    outputSchema: GetEmailOutputSchema,
  },
  async ({ accessToken, emailId }) => {
    // We request a minimal format to get headers and snippet.
    const response = await fetch(`${BASE_URL}/${emailId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gmail get email failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return data;
  }
);

