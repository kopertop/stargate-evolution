import { z } from 'zod';

export const SkillSchema = z.object({
	name: z.string(),
	level: z.number().default(0),
	experience: z.number().default(0),
});

export type Skill = z.infer<typeof SkillSchema>;

export const ProgressionSchema = z.object({
	total_experience: z.number().default(0),
	current_level: z.number().default(0),
	skills: z.array(SkillSchema).default([]),
});

export type Progression = z.infer<typeof ProgressionSchema>;
