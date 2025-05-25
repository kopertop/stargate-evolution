// Simple TypeScript types for auth functionality
export interface User {
	id: string;
	email: string;
	name: string;
	picture?: string;
}

export interface Session {
	token: string;
	refreshToken: string;
	user: User;
	expiresAt: number;
}

// Simple validation functions to replace Zod
export function validateUser(data: any): { success: boolean; data?: User; error?: string } {
	if (!data || typeof data !== 'object') {
		return { success: false, error: 'Invalid user data' };
	}

	if (typeof data.id !== 'string' || !data.id) {
		return { success: false, error: 'Invalid user id' };
	}

	if (typeof data.email !== 'string' || !data.email) {
		return { success: false, error: 'Invalid user email' };
	}

	if (typeof data.name !== 'string' || !data.name) {
		return { success: false, error: 'Invalid user name' };
	}

	return {
		success: true,
		data: {
			id: data.id,
			email: data.email,
			name: data.name,
			picture: data.picture || undefined,
		},
	};
}

export function validateSession(data: any): { success: boolean; data?: Session; error?: string } {
	if (!data || typeof data !== 'object') {
		return { success: false, error: 'Invalid session data' };
	}

	if (typeof data.token !== 'string' || !data.token) {
		return { success: false, error: 'Invalid token' };
	}

	if (typeof data.refreshToken !== 'string' || !data.refreshToken) {
		return { success: false, error: 'Invalid refresh token' };
	}

	if (typeof data.expiresAt !== 'number') {
		return { success: false, error: 'Invalid expiration time' };
	}

	const userValidation = validateUser(data.user);
	if (!userValidation.success) {
		return { success: false, error: userValidation.error };
	}

	return {
		success: true,
		data: {
			token: data.token,
			refreshToken: data.refreshToken,
			user: userValidation.data!,
			expiresAt: data.expiresAt,
		},
	};
}
