import { z } from 'zod';
import { GamePlanet } from '../../types';

// Planet theme from the planet type
export interface PlanetThemeProps {
	wallColor: string;
	floorColor: string;
	ceilingColor?: string;
	ambientLight: string;
	pointLightColor: string;
	pointLightIntensity: number;
}

// Planet props interface
export interface PlanetProps {
	planet: GamePlanet;
	isActive: boolean;
	onClick?: () => void;
}

// Planet controller props
export interface PlanetControllerProps {
	onPlanetChange?: (planetId: string) => void;
}
