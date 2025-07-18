import { z } from 'zod';

export const UserSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string(),
	picture: z.string().optional().nullable(),
	is_admin: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;
