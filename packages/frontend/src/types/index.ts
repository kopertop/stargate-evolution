// Simple TypeScript types for frontend use

// Auth types
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

// Re-export model-based types
export type {
	RoomType as Room,
	DestinyStatusType as DestinyStatus,
	PersonType as Person,
	DoorInfo,
	DoorRequirement,
} from './model-types';

export {
	roomModelToType,
	destinyStatusModelToType,
	personModelToType,
} from './model-types';
