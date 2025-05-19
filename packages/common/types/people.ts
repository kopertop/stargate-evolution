import { z } from 'zod';

// --- Person ---
export const PersonSchema = z.object({
	id: z.string(),
	name: z.string(),
	raceId: z.string(),
	role: z.string(), // e.g., 'captain', 'engineer', etc.
	location: z.object({
		roomId: z.string().optional(),
		planetId: z.string().optional(),
		shipId: z.string().optional(),
	}),
	description: z.string().optional(),
	image: z.string().optional(),
	conditions: z.array(z.string()).optional(),
});
export type Person = z.infer<typeof PersonSchema>;

// --- Alien (extends Person) ---
export const AlienSchema = PersonSchema.extend({
	species: z.string(),
	abilities: z.array(z.string()).optional(),
});
export type Alien = z.infer<typeof AlienSchema>;

// --- Robot ---
export const RobotSchema = z.object({
	id: z.string(),
	model: z.string(),
	assignedRoomId: z.string().optional(),
	abilities: z.array(z.string()).optional(),
	description: z.string().optional(),
	image: z.string().optional(),
	conditions: z.array(z.string()).optional(),
	location: z.object({
		roomId: z.string().optional(),
		planetId: z.string().optional(),
		shipId: z.string().optional(),
	}),
});
export type Robot = z.infer<typeof RobotSchema>;
