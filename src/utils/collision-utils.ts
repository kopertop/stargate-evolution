import * as THREE from 'three';

interface Wall {
	position: THREE.Vector3;
	size: THREE.Vector3;
	rotation: THREE.Euler;
}

export interface InteractableObject {
	type: 'stargate' | 'dhd' | 'other';
	position: THREE.Vector3;
	radius: number;
}

export interface RoomDimensions {
	size: [number, number]; // x, z dimensions
	wallHeight: number;
}

// Generate wall colliders from room dimensions
export const generateRoomColliders = (dimensions: RoomDimensions): Wall[] => {
	const { size, wallHeight } = dimensions;
	const halfWidth = size[0] / 2;
	const halfDepth = size[1] / 2;

	return [
		// North wall (negative Z)
		{
			position: new THREE.Vector3(0, wallHeight / 2, -halfDepth),
			size: new THREE.Vector3(size[0], wallHeight, 0.2),
			rotation: new THREE.Euler(0, 0, 0)
		},
		// South wall (positive Z)
		{
			position: new THREE.Vector3(0, wallHeight / 2, halfDepth),
			size: new THREE.Vector3(size[0], wallHeight, 0.2),
			rotation: new THREE.Euler(0, 0, 0)
		},
		// West wall (negative X)
		{
			position: new THREE.Vector3(-halfWidth, wallHeight / 2, 0),
			size: new THREE.Vector3(0.2, wallHeight, size[1]),
			rotation: new THREE.Euler(0, 0, 0)
		},
		// East wall (positive X)
		{
			position: new THREE.Vector3(halfWidth, wallHeight / 2, 0),
			size: new THREE.Vector3(0.2, wallHeight, size[1]),
			rotation: new THREE.Euler(0, 0, 0)
		}
	];
};

// Check if a point collides with a wall
export const checkWallCollision = (
	position: THREE.Vector3,
	characterRadius: number,
	walls: Wall[]
): boolean => {
	for (const wall of walls) {
		// Create wall box for collision detection
		const wallBox = new THREE.Box3().setFromCenterAndSize(
			wall.position,
			wall.size
		);

		// Expand the wall box by the character radius to account for character size
		wallBox.expandByScalar(characterRadius);

		// Check if the point is inside the expanded box
		if (wallBox.containsPoint(position)) {
			return true;
		}
	}

	return false;
};

// Check if a point collides with an interactable object
export const checkObjectCollision = (
	position: THREE.Vector3,
	characterRadius: number,
	objects: InteractableObject[]
): boolean => {
	for (const object of objects) {
		const distance = position.distanceTo(
			new THREE.Vector3(
				object.position.x,
				position.y, // Use character's y-position for horizontal distance
				object.position.z
			)
		);

		if (distance < (characterRadius + object.radius)) {
			return true;
		}
	}

	return false;
};

// Check if a movement will result in a collision and adjust accordingly
export const checkAndResolveCollision = (
	currentPosition: THREE.Vector3,
	targetPosition: THREE.Vector3,
	characterRadius: number,
	walls: Wall[],
	objects: InteractableObject[] = []
): THREE.Vector3 => {
	// Check if the target position collides with any walls
	if (checkWallCollision(targetPosition, characterRadius, walls)) {
		// If collision detected, don't move (or implement sliding later)
		return currentPosition.clone();
	}

	// Check collision with objects (if any were provided)
	if (objects.length > 0 && checkObjectCollision(targetPosition, characterRadius, objects)) {
		return currentPosition.clone();
	}

	// No collision, return the target position
	return targetPosition.clone();
};

// Get the nearest interactable object and its distance
export const getNearestInteractable = (
	position: THREE.Vector3,
	objects: InteractableObject[]
): { object: InteractableObject | null, distance: number } => {
	let nearestObject: InteractableObject | null = null;
	let minDistance = Infinity;

	for (const object of objects) {
		const distance = position.distanceTo(
			new THREE.Vector3(
				object.position.x,
				position.y, // Use character's y-position for horizontal distance
				object.position.z
			)
		);

		if (distance < minDistance) {
			minDistance = distance;
			nearestObject = object;
		}
	}

	return { object: nearestObject, distance: minDistance };
};
