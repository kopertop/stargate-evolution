import { create } from 'zustand';
import * as THREE from 'three';

interface CharacterState {
	position: THREE.Vector3;
	rotation: number;
	isMoving: boolean;
	updatePosition: (newPos: THREE.Vector3) => void;
	updateRotation: (newRotation: number) => void;
	setMoving: (isMoving: boolean) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
	position: new THREE.Vector3(0, 0, 0),
	rotation: 0,
	isMoving: false,

	updatePosition: (newPos: THREE.Vector3) => set({ position: newPos }),

	updateRotation: (newRotation: number) => set({ rotation: newRotation }),

	setMoving: (isMoving: boolean) => set({ isMoving }),
}));
