import * as THREE from 'three';
import { Planets } from '../../types/index';

// Define visual themes for different planets
export const PLANET_THEMES: Record<Planets, {
	wallColor: string;
	floorColor: string;
	ambientLight: string;
	pointLightColor: string;
}> = {
	Earth: {
		wallColor: '#555555',
		floorColor: '#444444',
		ambientLight: '#ffffff',
		pointLightColor: '#66ccff'
	},
	Abydos: {
		wallColor: '#AA8855', // Sandy/desert color
		floorColor: '#8A6642', // Darker sand color
		ambientLight: '#ffebcd', // Desert light color
		pointLightColor: '#ffdab9' // Peach/sand color for lights
	}
	// Add more planets as needed
};

// Define spawn positions for each planet when arriving through stargate
export const SPAWN_POSITIONS: Record<Planets, THREE.Vector3> = {
	Earth: new THREE.Vector3(0, 0.5, -6), // In front of the gate
	Abydos: new THREE.Vector3(0, 0.5, -6)  // In front of the gate
};

/**
 * Gets the theme for a specific planet
 */
export const getPlanetTheme = (planet: Planets) => {
	return PLANET_THEMES[planet] || PLANET_THEMES.Earth;
};

/**
 * Gets the spawn position for a specific planet
 */
export const getSpawnPosition = (planet: Planets) => {
	return SPAWN_POSITIONS[planet] || new THREE.Vector3(0, 0.5, -6);
};
