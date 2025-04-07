import { z } from 'zod';
import { Planets } from '../../types';

// Game settings schema
export const GameSettings = z.object({
	audioEnabled: z.boolean().default(true),
	showTutorials: z.boolean().default(true),
	autoSave: z.boolean().default(true),
	autoSaveInterval: z.number().min(1).default(10), // Every 10 turns
	difficulty: z.enum(['easy', 'normal', 'hard']).default('normal'),
});

export type GameSettings = z.infer<typeof GameSettings>;

// Game state schema
export const GameState = z.object({
	currentPlanet: z.enum(['Earth', 'Abydos']).default('Earth'),
	currentLocation: z.string().default('Stargate Command'),
	isInWormhole: z.boolean().default(false),
	gameSettings: GameSettings,
});

export type GameState = z.infer<typeof GameState>;

// Game UI props
export interface GameUIProps {
	isInWormhole: boolean;
	currentPlanet: Planets;
	currentLocation: string;
}

// Game controller props
export interface GameControllerProps {
	onGameStateChange?: (state: GameState) => void;
}
