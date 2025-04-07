import * as THREE from 'three';
import { z } from 'zod';

// DHD position schema
export const DHDPosition = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number(),
});

export type DHDPosition = z.infer<typeof DHDPosition>;

// DHD props interface
export interface DHDProps {
	position: [number, number, number];
	isActive: boolean;
	onActivate: () => void;
}

// DHD controller props
export interface DHDControllerProps {
	isActive: boolean;
	position: [number, number, number];
	onActivate: () => void;
	interactableObject: string | null;
}
