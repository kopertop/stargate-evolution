import { z } from 'zod';

export const CreateGameRequestSchema = z.object({
	// userId: z.string().min(1), // Removed as per refactoring
});
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;

export const ListGamesRequestSchema = z.object({
	// userId: z.string().min(1), // Removed as per refactoring
});
export type ListGamesRequest = z.infer<typeof ListGamesRequestSchema>;

export const GetGameRequestSchema = z.object({
	// userId: z.string().min(1), // Removed as per refactoring
	gameId: z.string().min(1),
});
export type GetGameRequest = z.infer<typeof GetGameRequestSchema>;
