import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

import type { User } from './auth-types';

export interface Env {
	DB: D1Database;
	R2_BUCKET: R2Bucket;
	JWT_SECRET: string;
	ADMIN_EMAIL: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	CLOUDFLARE_ACCOUNT_ID: string;
	R2_PUBLIC_DOMAIN?: string;
}

export type { User };
