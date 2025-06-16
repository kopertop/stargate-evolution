import { z } from 'zod';

import { UserSchema } from './user';

export const SessionSchema = z.object({
	token: z.string(),
	refreshToken: z.string(),
	user: UserSchema,
	expiresAt: z.number(),
});

export type Session = z.infer<typeof SessionSchema>;
