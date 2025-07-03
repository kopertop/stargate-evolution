import { z } from 'zod';

// Saved game schema
export const SavedGameSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	game_data: z.string(), // JSON string containing complete game state
	created_at: z.number(),
	updated_at: z.number(),
});

export type SavedGame = z.infer<typeof SavedGameSchema>;

// Schema for creating a new saved game
export const CreateSavedGameSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	game_data: z.string(), // JSON string
});

export type CreateSavedGame = z.infer<typeof CreateSavedGameSchema>;

// Schema for updating a saved game
export const UpdateSavedGameSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional(),
	game_data: z.string().optional(), // JSON string
});

export type UpdateSavedGame = z.infer<typeof UpdateSavedGameSchema>;

// Schema for listing saved games (without the large game_data field)
export const SavedGameListItemSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type SavedGameListItem = z.infer<typeof SavedGameListItemSchema>;
