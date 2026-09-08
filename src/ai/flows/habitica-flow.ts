
'use server';

/**
 * @fileOverview A self-contained "GotchiQuest" gamification engine.
 * This system manages its own tasks and user progression (XP, HP, Gold, Level)
 * without relying on an external service. It is based on the user's defined
 * GamificationEngine class logic.
 * 
 * - getGotchiQuestUserStats - Fetches the user's stats.
 * - getGotchiQuestTasks - Fetches all tasks (habits, dailies, todos, rewards).
 * - scoreGotchiQuestTask - Scores a task, claims a reward, and updates user stats.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { GotchiQuestTaskSchema, GotchiQuestUserStatsSchema, type GotchiQuestTask, type GotchiQuestUserStats, GotchiQuestTaskTypeEnum } from '@/types';

// In-memory dummy data store for our independent gamification system
let player: GotchiQuestUserStats = {
  level: 3,
  xp: 80,
  hp: 85,
  gold: 40,
};

let tasks: GotchiQuestTask[] = [
  // Habits
  { id: 'h1', type: 'habit', text: 'Wasser trinken 💧', notes: 'Stay hydrated!' },
  { id: 'h2', type: 'habit', text: 'Pause gemacht 🧘‍♂️', notes: 'Take a break.' },
  
  // Dailies
  { id: 'd1', type: 'daily', text: '10min Stretching 🧘', completed: false, streak: 3 },
  { id: 'd2', type: 'daily', text: '1 Commit schreiben 🧑‍💻', completed: false, streak: 5 },
  
  // Todos
  { id: 't1', type: 'todo', text: 'Browser-Extension backupen', completed: false },
  { id: 't2', type: 'todo', text: 'Neues Widget hinzufügen', completed: true },
  { id: 't3', type: 'todo', text: 'Commit pushen 🚀', completed: false },

  // Rewards
  { id: 'r1', type: 'reward', text: 'Kaffee ☕️', cost: 15 },
  { id: 'r2', type: 'reward', text: '30min zocken 🎮', cost: 30 },
  { id: 'r3', type: 'reward', text: 'Chill-Modus aktivieren 🛋️', cost: 10 },
];


// --- Schemas ---
const ScoreTaskInputSchema = z.object({
    taskId: z.string(),
    type: GotchiQuestTaskTypeEnum,
    direction: z.enum(['up', 'down']).optional(),
});

// Defines the output for all interactions, returning the full state
const GotchiQuestStateSchema = z.object({
    player: GotchiQuestUserStatsSchema,
    tasks: z.array(GotchiQuestTaskSchema),
});


// --- Public Functions ---

export async function getGotchiQuestState(): Promise<z.infer<typeof GotchiQuestStateSchema>> {
  return getGotchiQuestStateFlow();
}

export async function scoreGotchiQuestTask(input: z.infer<typeof ScoreTaskInputSchema>): Promise<z.infer<typeof GotchiQuestStateSchema>> {
    return scoreGotchiQuestTaskFlow(input);
}


// --- Helper Logic ---

function levelUpCheck() {
    const xpNeeded = player.level * 100;
    if (player.xp >= xpNeeded) {
        player.level++;
        player.xp -= xpNeeded;
        player.hp = 100; // Refill HP on level up
    }
}

function resetDailiesIfNeeded() {
    // This is a simple implementation. A real one would compare the current date
    // with the last completed date for each daily. For this dummy version, we'll
    // just assume dailies reset every time the server restarts or data is re-read.
    tasks.forEach(task => {
        if (task.type === 'daily') {
            task.completed = false;
        }
    });
}

// Initialize with reset
resetDailiesIfNeeded();

// --- Flows ---

const getGotchiQuestStateFlow = ai.defineFlow(
  {
    name: 'getGotchiQuestStateFlow',
    inputSchema: z.void(),
    outputSchema: GotchiQuestStateSchema,
  },
  async () => {
    return { player: { ...player }, tasks: [...tasks] };
  }
);


const scoreGotchiQuestTaskFlow = ai.defineFlow(
  {
    name: 'scoreGotchiQuestTaskFlow',
    inputSchema: ScoreTaskInputSchema,
    outputSchema: GotchiQuestStateSchema,
  },
  async ({ taskId, type, direction }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error("Task not found");

    switch (type) {
        case 'todo':
            if (task.type === 'todo' && !task.completed) {
                task.completed = true;
                player.xp += 20;
                player.gold += 10;
            }
            break;
        case 'habit':
             if (task.type === 'habit') {
                if (direction === 'up') {
                    player.xp += 10;
                    player.gold += 2;
                } else { // 'down'
                    player.hp = Math.max(0, player.hp - 5);
                }
            }
            break;
        case 'daily':
            if (task.type === 'daily' && !task.completed) {
                task.completed = true;
                task.streak = (task.streak || 0) + 1;
                player.xp += 15 * (1 + task.streak * 0.1); // Streak bonus
                player.gold += 5;
            }
            break;
        case 'reward':
            if (task.type === 'reward' && task.cost) {
                if (player.gold >= task.cost) {
                    player.gold -= task.cost;
                } else {
                     throw new Error("Not enough gold!");
                }
            }
            break;
    }

    levelUpCheck();
    
    // Return the full state of the game
    return { player: { ...player }, tasks: [...tasks] };
  }
);
