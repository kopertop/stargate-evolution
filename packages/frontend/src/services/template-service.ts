// Template service for fetching game templates from backend API
// Simplified version without WatermelonDB dependencies

export interface RoomTemplate {
	id: string;
	type: string;
	name: string;
	description?: string;
	image?: string;
	default_status: string;
	default_technology: string[]; // JSON array
}

export interface PersonTemplate {
	id: string;
	name: string;
	role: string;
	race_template_id?: string;
	default_location?: any; // JSON object
	skills: string[]; // JSON array
	description?: string;
	image?: string;
}

export interface RaceTemplate {
	id: string;
	name: string;
	default_technology: string[]; // JSON array
	default_ships: string[]; // JSON array
}

export interface ShipLayoutRoom {
	id: string;
	start_x: number;
	start_y: number;
	end_x: number;
	end_y: number;
	floor: number;
	initial_state: string; // JSON object
	connection_north?: string;
	connection_south?: string;
	connection_east?: string;
	connection_west?: string;
}

export interface ShipLayoutDoor {
	from_room_id: string;
	to_room_id: string;
	initial_state: string;
	requirements?: string; // JSON array
	description?: string;
}

export interface ShipLayout {
	layout_id: string;
	rooms: ShipLayoutRoom[];
	doors: ShipLayoutDoor[];
}

class TemplateService {
	private baseUrl: string;
	private cache: Map<string, any> = new Map();
	private cacheExpiry: Map<string, number> = new Map();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	constructor() {
		// Use environment variable if available, otherwise default to localhost
		this.baseUrl = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8787';
	}

	private async fetchWithCache<T>(endpoint: string): Promise<T> {
		const cacheKey = endpoint;
		const now = Date.now();

		console.log(`[TemplateService] Fetching ${endpoint} from ${this.baseUrl}`);

		// Check if we have valid cached data
		if (this.cache.has(cacheKey) && this.cacheExpiry.has(cacheKey)) {
			const expiry = this.cacheExpiry.get(cacheKey)!;
			if (now < expiry) {
				console.log(`[TemplateService] Using cached data for ${endpoint}`);
				return this.cache.get(cacheKey) as T;
			}
		}

		// Fetch fresh data
		try {
			const fullUrl = `${this.baseUrl}${endpoint}`;
			console.log(`[TemplateService] Making request to: ${fullUrl}`);

			const response = await fetch(fullUrl);
			console.log(`[TemplateService] Response status: ${response.status} ${response.statusText}`);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			console.log(`[TemplateService] Successfully fetched ${endpoint}, data length:`, Array.isArray(data) ? data.length : 'not array');

			// Cache the data
			this.cache.set(cacheKey, data);
			this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

			return data as T;
		} catch (error) {
			console.error(`[TemplateService] Failed to fetch ${endpoint}:`, error);

			// Return cached data if available, even if expired
			if (this.cache.has(cacheKey)) {
				console.warn(`[TemplateService] Using expired cache for ${endpoint}`);
				return this.cache.get(cacheKey) as T;
			}

			throw error;
		}
	}

	async getAllRoomTemplates(): Promise<RoomTemplate[]> {
		return this.fetchWithCache<RoomTemplate[]>('/api/templates/rooms');
	}

	async getRoomTemplateById(id: string): Promise<RoomTemplate | null> {
		try {
			return await this.fetchWithCache<RoomTemplate>(`/api/templates/rooms/${id}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	async getAllPersonTemplates(): Promise<PersonTemplate[]> {
		return this.fetchWithCache<PersonTemplate[]>('/api/templates/people');
	}

	async getAllRaceTemplates(): Promise<RaceTemplate[]> {
		return this.fetchWithCache<RaceTemplate[]>('/api/templates/races');
	}

	async getAllShipLayouts(): Promise<ShipLayout[]> {
		return this.fetchWithCache<ShipLayout[]>('/api/templates/ship-layouts');
	}

	async getShipLayoutById(id: string): Promise<ShipLayout | null> {
		try {
			return await this.fetchWithCache<ShipLayout>(`/api/templates/ship-layouts/${id}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	// Helper methods for parsing JSON fields
	parseSkills(skillsJson: string | string[]): string[] {
		if (Array.isArray(skillsJson)) return skillsJson;
		try {
			return JSON.parse(skillsJson);
		} catch {
			return [];
		}
	}

	parseTechnology(technologyJson: string | string[]): string[] {
		if (Array.isArray(technologyJson)) return technologyJson;
		try {
			return JSON.parse(technologyJson);
		} catch {
			return [];
		}
	}

	parseLocation(locationJson: string | any): any {
		if (typeof locationJson === 'object') return locationJson;
		try {
			return JSON.parse(locationJson);
		} catch {
			return {};
		}
	}

	parseRequirements(requirementsJson: string | any[]): any[] {
		if (Array.isArray(requirementsJson)) return requirementsJson;
		try {
			return JSON.parse(requirementsJson);
		} catch {
			return [];
		}
	}

	// Clear cache (useful for testing or forced refresh)
	clearCache(): void {
		this.cache.clear();
		this.cacheExpiry.clear();
	}

	// Get cache status for debugging
	getCacheStatus(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys()),
		};
	}
}

// Export a singleton instance
export const templateService = new TemplateService();
export default templateService;
