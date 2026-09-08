
'use server';

/**
 * @fileOverview A flow to fetch data from the Google Sheets API.
 * 
 * - listSpreadsheets - Lists the user's spreadsheets.
 * - getSheetData - Fetches data from a specific sheet and range.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Schemas ---

const AuthInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});

const ListSpreadsheetsOutputSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
}));

const GetSheetDataInputSchema = AuthInputSchema.extend({
  spreadsheetId: z.string(),
  range: z.string(),
});
const GetSheetDataOutputSchema = z.object({
  range: z.string(),
  majorDimension: z.string(),
  values: z.array(z.array(z.string())).optional(),
});


// --- Public Functions ---

export async function listSpreadsheets(accessToken: string) {
  return listSpreadsheetsFlow({ accessToken });
}

export async function getSheetData(input: z.infer<typeof GetSheetDataInputSchema>) {
  return getSheetDataFlow(input);
}


// --- Flows ---

const listSpreadsheetsFlow = ai.defineFlow(
  {
    name: 'listSpreadsheetsFlow',
    inputSchema: AuthInputSchema,
    outputSchema: ListSpreadsheetsOutputSchema,
  },
  async ({ accessToken }) => {
    // Note: This requires the Google Drive API to be enabled in the Cloud Console.
    // The scope 'https://www.googleapis.com/auth/drive.readonly' or similar might be needed.
    // For simplicity, we assume the user has granted broad permissions or we're just listing sheets.
    // Listing *only* sheets is tricky; it's easier to list files and filter by mimeType.
    const response = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Drive file list failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return (data.files || []).map((file: any) => ({ id: file.id, name: file.name }));
  }
);


const getSheetDataFlow = ai.defineFlow(
  {
    name: 'getSheetDataFlow',
    inputSchema: GetSheetDataInputSchema,
    outputSchema: GetSheetDataOutputSchema,
  },
  async ({ accessToken, spreadsheetId, range }) => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Sheets fetch failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return data;
  }
);
