/**
 * Simple utility to generate unique IDs without using crypto
 */

// Counter to ensure uniqueness even with same timestamp
let counter = 0;

/**
 * Generates a simple unique ID using timestamp and counter
 * Format: timestamp-counter-random
 */
export function generateId(): string {
	const timestamp = Date.now().toString(36);
	const randomPart = Math.floor(Math.random() * 1000000).toString(36);

	// Increment and get counter
	counter = (counter + 1) % 1000000;
	const counterStr = counter.toString(36).padStart(4, '0');

	return `${timestamp}-${counterStr}-${randomPart}`;
}

/**
 * Generate a simple ID specifically for the given entity type
 * Format: type-timestamp-counter
 */
export function generateEntityId(entityType: string): string {
	const timestamp = Date.now().toString(36);

	// Increment and get counter
	counter = (counter + 1) % 1000000;
	const counterStr = counter.toString(36).padStart(4, '0');

	return `${entityType}-${timestamp}-${counterStr}`;
}
