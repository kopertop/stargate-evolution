import { z } from 'zod';

import { ProgressionSchema } from './progression';

export const CharacterSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	name: z.string(),
	role: z.string(),
	race_template_id: z.string().optional().nullable(),
	skills: z.string(), // JSON string of character skills
	progression: ProgressionSchema.default({ total_experience: 0, current_level: 0, skills: [] }),
	description: z.string().optional().nullable(),
	image: z.string().optional().nullable(),	
	current_room_id: z.string(),
	health: z.number().default(100),
	hunger: z.number().default(100),
	thirst: z.number().default(100),
	fatigue: z.number().default(100),
	created_at: z.number(),
	updated_at: z.number(),
});

export type Character = z.infer<typeof CharacterSchema>;
