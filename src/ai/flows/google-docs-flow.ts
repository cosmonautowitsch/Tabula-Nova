
'use server';

/**
 * @fileOverview A flow to fetch data from the Google Docs API.
 * 
 * - listDocuments - Lists the user's Google Docs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GoogleDocSchema } from '@/types';

// --- Schemas ---

const AuthInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});

const ListDocumentsOutputSchema = z.array(GoogleDocSchema);

// --- Public Functions ---

export async function listDocuments(accessToken: string) {
  return listDocumentsFlow({ accessToken });
}

// --- Flows ---

const listDocumentsFlow = ai.defineFlow(
  {
    name: 'listGoogleDocsFlow',
    inputSchema: AuthInputSchema,
    outputSchema: ListDocumentsOutputSchema,
  },
  async ({ accessToken }) => {
    // Note: This requires the Google Drive API to be enabled in the Cloud Console.
    const response = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document'", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Drive file list failed for Docs: ${error.error?.message}`);
    }
    const data = await response.json();
    
    return (data.files || []).map((file: any) => ({ 
        id: file.id, 
        name: file.name,
        webViewLink: file.webViewLink,
    }));
  }
);
