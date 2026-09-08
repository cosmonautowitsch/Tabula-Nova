
'use server';

/**
 * @fileOverview A flow to fetch and manage tasks from a Notion database.
 * 
 * - fetchNotionTasks - Fetches tasks.
 * - addNotionTask - Adds a new task.
 * - deleteNotionTask - Archives (deletes) a task.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Client } from "@notionhq/client";
import type { NotionTask } from '@/types';
import { NotionTaskSchema } from '@/types';

const NotionTasksInputSchema = z.object({
  databaseId: z.string().describe('The ID of the Notion database to query for tasks.'),
});

const NotionTasksOutputSchema = z.array(NotionTaskSchema);

// Maps a raw Notion page to our unified NotionTask format.
// This assumes specific property names: 'Name' (Title), 'Status' (Select/Status), 'Tags' (Multi-select).
function mapNotionToTask(page: any): NotionTask | null {
    const props = page?.properties;
    if (!props) return null;

    // Use specific property names for robust mapping
    const titleProp = props['Name'];
    const statusProp = props['Status'];
    const tagsProp = props['Tags'];

    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || null;

    // A task must have a title to be considered valid.
    if (!title) {
        return null;
    }

    const status = statusProp?.status?.name || statusProp?.select?.name || null;
    const tags = tagsProp?.multi_select?.map((t: any) => t.name) || [];

    return {
        id: page.id,
        title: title,
        status: status,
        tags: tags,
        raw: page,
    };
}

export async function fetchNotionTasks(databaseId: string): Promise<NotionTask[]> {
    if (!databaseId) return [];
    return fetchNotionTasksFlow({ databaseId });
}

const fetchNotionTasksFlow = ai.defineFlow(
  {
    name: 'fetchNotionTasksFlow',
    inputSchema: NotionTasksInputSchema,
    outputSchema: NotionTasksOutputSchema,
  },
  async ({ databaseId }) => {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) throw new Error("Notion API key is not configured on the server.");
    
    const notion = new Client({ auth: apiKey });

    try {
        const response = await notion.databases.query({ database_id: databaseId });
        return response.results.map(mapNotionToTask).filter((task): task is NotionTask => task !== null);
    } catch(e: any) {
        console.error("Error fetching tasks from Notion:", e.body || e.message);
        throw new Error(`Failed to fetch tasks from Notion. Error: ${e.code || e.message}`);
    }
  }
);


// --- Write Operations ---

const AddTaskInputSchema = z.object({
    databaseId: z.string(),
    title: z.string(),
});

export async function addNotionTask(input: z.infer<typeof AddTaskInputSchema>): Promise<{ id: string }> {
    return addNotionTaskFlow(input);
}

const addNotionTaskFlow = ai.defineFlow(
    {
        name: 'addNotionTaskFlow',
        inputSchema: AddTaskInputSchema,
        outputSchema: z.object({ id: z.string() }),
    },
    async ({ databaseId, title }) => {
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) throw new Error("Notion API key is not configured.");
        const notion = new Client({ auth: apiKey });

        // This assumes the database has a title property named "Name".
        try {
            const response = await notion.pages.create({
                parent: { database_id: databaseId },
                properties: {
                    'Name': { // Assumes a title property named "Name"
                        title: [{ text: { content: title } }]
                    }
                }
            });
            return { id: response.id };
        } catch (e: any) {
            console.error("Error creating task in Notion:", e.body || e.message);
            throw new Error(`Failed to create task. Error: ${e.code || e.message}`);
        }
    }
);


const DeleteTaskInputSchema = z.object({
    pageId: z.string(),
});

export async function deleteNotionTask(input: z.infer<typeof DeleteTaskInputSchema>): Promise<{ success: boolean }> {
    return deleteNotionTaskFlow(input);
}

const deleteNotionTaskFlow = ai.defineFlow(
    {
        name: 'deleteNotionTaskFlow',
        inputSchema: DeleteTaskInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ pageId }) => {
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) throw new Error("Notion API key is not configured.");
        const notion = new Client({ auth: apiKey });
        
        try {
            await notion.pages.update({
                page_id: pageId,
                archived: true, // Archiving a page is Notion's version of deleting
            });
            return { success: true };
        } catch (e: any) {
            console.error("Error deleting task in Notion:", e.body || e.message);
            throw new Error(`Failed to delete task. Error: ${e.code || e.message}`);
        }
    }
);
