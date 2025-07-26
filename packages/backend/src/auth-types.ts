// Simple TypeScript types for auth functionality
import { Character } from '@stargate/common';

export interface User {
	id: string;
	email: string;
	name: string;
	picture?: string;
	is_admin?: boolean;
	api_key?: string;
}

export interface Session {
	token: string;
	refreshToken: string;
	user: User;
	expiresAt: number;
}

// Simple validation functions to replace Zod
export function validateUser(data: any): { success: boolean; data?: User; error?: string } {
	console.log('Validate User', data);
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
	console.log('Validate User', data.email);

	return {
		success: true,
		data: {
			id: data.id,
			email: data.email,
			name: data.name,
			picture: data.picture || undefined,
			is_admin: Boolean(data.is_admin) || data.email === 'kopertop@gmail.com' || false,
			api_key: data.api_key || undefined,
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

export function validateCharacter(data: any): { success: boolean; data?: Character; error?: string } {
	if (!data || typeof data !== 'object') {
		return { success: false, error: 'Invalid character data' };
	}

	if (typeof data.id !== 'string' || !data.id) {
		return { success: false, error: 'Invalid character id' };
	}

	if (typeof data.user_id !== 'string' || !data.user_id) {
		return { success: false, error: 'Invalid user ID for character' };
	}

	if (typeof data.name !== 'string' || !data.name) {
		return { success: false, error: 'Invalid character name' };
	}

	if (typeof data.role !== 'string' || !data.role) {
		return { success: false, error: 'Invalid character role' };
	}

	// Validate progression or create default
	const progression = data.progression || {
		total_experience: 0,
		current_level: 0,
		skills: [],
	};

	if (typeof data.current_room_id !== 'string' || !data.current_room_id) {
		return { success: false, error: 'Invalid current room ID' };
	}

	if (typeof data.health !== 'number' || data.health < 0 || data.health > 100) {
		return { success: false, error: 'Invalid health value' };
	}

	if (typeof data.hunger !== 'number' || data.hunger < 0 || data.hunger > 100) {
		return { success: false, error: 'Invalid hunger value' };
	}

	if (typeof data.thirst !== 'number' || data.thirst < 0 || data.thirst > 100) {
		return { success: false, error: 'Invalid thirst value' };
	}

	if (typeof data.fatigue !== 'number' || data.fatigue < 0 || data.fatigue > 100) {
		return { success: false, error: 'Invalid fatigue value' };
	}

	return {
		success: true,
		data: {
			id: data.id,
			user_id: data.user_id,
			name: data.name,
			role: data.role,
			race_template_id: data.race_template_id || undefined,
			progression: progression,
			description: data.description || undefined,
			image: data.image || undefined,
			current_room_id: data.current_room_id,
			health: data.health,
			hunger: data.hunger,
			thirst: data.thirst,
			fatigue: data.fatigue,
			created_at: data.created_at || Date.now(),
			updated_at: data.updated_at || Date.now(),
		},
	};
}

