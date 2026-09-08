
'use server';

/**
 * @fileOverview A flow to fetch and manage tasks from the Google Tasks API.
 * 
 * - fetchGoogleTaskLists - Fetches all task lists for the user.
 * - fetchTasksFromList - Fetches all tasks within a specific task list.
 * - createGoogleTask - Creates a new task in a specific list.
 * - deleteGoogleTask - Deletes a task from a list.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GoogleTaskListSchema, GoogleTaskSchema, type GoogleTask } from '@/types';

// --- Schemas ---

const FetchTaskListsInputSchema = z.object({
  accessToken: z.string().describe('The Google OAuth 2.0 access token.'),
});
const FetchTaskListsOutputSchema = z.array(GoogleTaskListSchema);

const FetchTasksInputSchema = z.object({
  accessToken: z.string(),
  listId: z.string(),
});
const FetchTasksOutputSchema = z.array(GoogleTaskSchema);

const CreateTaskInputSchema = z.object({
  accessToken: z.string(),
  listId: z.string(),
  title: z.string(),
});
const CreateTaskOutputSchema = GoogleTaskSchema;

const DeleteTaskInputSchema = z.object({
  accessToken: z.string(),
  listId: z.string(),
  taskId: z.string(),
});
const DeleteTaskOutputSchema = z.object({
    success: z.boolean(),
});


// --- Public Functions ---

export async function fetchGoogleTaskLists(accessToken: string) {
  return fetchGoogleTaskListsFlow({ accessToken });
}

export async function fetchTasksFromList(accessToken: string, listId: string) {
  return fetchTasksFromListFlow({ accessToken, listId });
}

export async function createGoogleTask(accessToken: string, listId: string, title: string) {
  return createGoogleTaskFlow({ accessToken, listId, title });
}

export async function deleteGoogleTask(accessToken: string, listId: string, taskId: string) {
    return deleteGoogleTaskFlow({ accessToken, listId, taskId });
}


// --- Flows ---

const fetchGoogleTaskListsFlow = ai.defineFlow(
  {
    name: 'fetchGoogleTaskListsFlow',
    inputSchema: FetchTaskListsInputSchema,
    outputSchema: FetchTaskListsOutputSchema,
  },
  async ({ accessToken }) => {
    const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Tasklists fetch failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return data.items || [];
  }
);

const fetchTasksFromListFlow = ai.defineFlow(
  {
    name: 'fetchTasksFromListFlow',
    inputSchema: FetchTasksInputSchema,
    outputSchema: FetchTasksOutputSchema,
  },
  async ({ accessToken, listId }) => {
    // By default, completed tasks are not shown. Add showCompleted=true to see them.
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Tasks fetch failed: ${error.error?.message}`);
    }
    const data = await response.json();
    return data.items || [];
  }
);


const createGoogleTaskFlow = ai.defineFlow(
  {
    name: 'createGoogleTaskFlow',
    inputSchema: CreateTaskInputSchema,
    outputSchema: CreateTaskOutputSchema,
  },
  async ({ accessToken, listId, title }) => {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Task creation failed: ${error.error?.message}`);
    }
    return await response.json();
  }
);

const deleteGoogleTaskFlow = ai.defineFlow(
    {
        name: 'deleteGoogleTaskFlow',
        inputSchema: DeleteTaskInputSchema,
        outputSchema: DeleteTaskOutputSchema,
    },
    async ({ accessToken, listId, taskId }) => {
        const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 204) { // 204 No Content is a success for DELETE
            return { success: true };
        }
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Google Task deletion failed: ${error.error?.message}`);
        }
        return { success: true };
    }
);
