
'use server';

/**
 * @fileOverview A flow to fetch data from the Microsoft OneNote API.
 * 
 * - listNotebooks - Fetches the user's OneNote notebooks.
 * - listSections - Fetches sections within a notebook.
 * - listPages - Fetches pages within a section.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { OneNoteNotebookSchema, OneNoteSectionSchema, OneNotePageSchema, type OneNoteNotebook, type OneNoteSection, type OneNotePage } from '@/types';

const BASE_URL = "https://graph.microsoft.com/v1.0/me/onenote";

// --- Schemas ---

const AuthInputSchema = z.object({
  accessToken: z.string().describe('The Microsoft Graph API access token.'),
});

const ListSectionsInputSchema = AuthInputSchema.extend({
  notebookId: z.string(),
});
const ListPagesInputSchema = AuthInputSchema.extend({
  sectionId: z.string(),
});

// --- Public Functions ---

export async function listNotebooks(accessToken: string): Promise<OneNoteNotebook[]> {
  return listNotebooksFlow({ accessToken });
}

export async function listSections(accessToken: string, notebookId: string): Promise<OneNoteSection[]> {
  return listSectionsFlow({ accessToken, notebookId });
}

export async function listPages(accessToken: string, sectionId: string): Promise<OneNotePage[]> {
  return listPagesFlow({ accessToken, sectionId });
}

// --- Helper for API calls ---

async function graphApiCall(url: string, accessToken: string) {
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Microsoft Graph API error: ${error.error?.message}`);
    }
    const data = await response.json();
    return data.value || [];
}


// --- Flows ---

const listNotebooksFlow = ai.defineFlow(
  {
    name: 'listOneNoteNotebooksFlow',
    inputSchema: AuthInputSchema,
    outputSchema: z.array(OneNoteNotebookSchema),
  },
  async ({ accessToken }) => {
    return graphApiCall(`${BASE_URL}/notebooks`, accessToken);
  }
);

const listSectionsFlow = ai.defineFlow(
  {
    name: 'listOneNoteSectionsFlow',
    inputSchema: ListSectionsInputSchema,
    outputSchema: z.array(OneNoteSectionSchema),
  },
  async ({ accessToken, notebookId }) => {
    return graphApiCall(`${BASE_URL}/notebooks/${notebookId}/sections`, accessToken);
  }
);

const listPagesFlow = ai.defineFlow(
  {
    name: 'listOneNotePagesFlow',
    inputSchema: ListPagesInputSchema,
    outputSchema: z.array(OneNotePageSchema),
  },
  async ({ accessToken, sectionId }) => {
    return graphApiCall(`${BASE_URL}/sections/${sectionId}/pages`, accessToken);
  }
);
