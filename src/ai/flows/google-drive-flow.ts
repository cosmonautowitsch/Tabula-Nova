
'use server';

/**
 * @fileOverview A flow to fetch data from the Google Drive API.
 * 
 * - listFiles - Lists the user's recent Google Drive files.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GoogleDriveFileSchema } from '@/types';

// --- Schemas ---

const AuthInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});

const ListFilesOutputSchema = z.array(GoogleDriveFileSchema);

// --- Public Functions ---

export async function listFiles(accessToken: string) {
  return listFilesFlow({ accessToken });
}

// --- Flows ---

const listFilesFlow = ai.defineFlow(
  {
    name: 'listGoogleDriveFilesFlow',
    inputSchema: AuthInputSchema,
    outputSchema: ListFilesOutputSchema,
  },
  async ({ accessToken }) => {
    // Fetches the 15 most recently modified files.
    const response = await fetch("https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&pageSize=15&fields=files(id,name,mimeType,webViewLink,iconLink)", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Drive file list failed: ${error.error?.message}`);
    }
    const data = await response.json();
    
    return (data.files || []).map((file: any) => ({ 
        id: file.id, 
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
    }));
  }
);
