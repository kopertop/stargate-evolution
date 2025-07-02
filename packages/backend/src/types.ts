import type { D1Database } from '@cloudflare/workers-types';

import type { User } from './auth-types';

export interface Env {
	DB: D1Database;
	JWT_SECRET: string;
	ADMIN_EMAIL: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	// Add other bindings here as needed
	user: any;
}

export type { User };
