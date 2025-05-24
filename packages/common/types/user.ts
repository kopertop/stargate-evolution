import { z } from 'zod';

export const UserSchema = z.object({
	id: z.string(), // Google sub (user id)
	email: z.string().email(),
	name: z.string(),
	picture: z.string().url().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
	token: z.string(), // JWT or session token
	user: UserSchema,
	expiresAt: z.number(), // Unix timestamp (ms)
	refreshToken: z.string().optional(), // JWT refresh token
});
export type Session = z.infer<typeof SessionSchema>;
