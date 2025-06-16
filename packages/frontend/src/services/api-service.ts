// Template service for fetching game templates from backend API

import { Technology, TechnologyTemplate, trimNullStrings } from '@stargate/common';
import { ShipLayout, RoomTemplate, PersonTemplate, RaceTemplate, Galaxy, StarSystem, DestinyStatus, Inventory, RoomTechnology } from '@stargate/common';

class APIService {
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

		console.log(`[apiService] Fetching ${endpoint} from ${this.baseUrl}`);

		// Check if we have valid cached data
		if (this.cache.has(cacheKey) && this.cacheExpiry.has(cacheKey)) {
			const expiry = this.cacheExpiry.get(cacheKey)!;
			if (now < expiry) {
				console.log(`[apiService] Using cached data for ${endpoint}`);
				return trimNullStrings(this.cache.get(cacheKey)) as T;
			}
		}

		// Fetch fresh data
		try {
			const fullUrl = `${this.baseUrl}${endpoint}`;
			console.log(`[apiService] Making request to: ${fullUrl}`);

			const response = await fetch(fullUrl);
			console.log(`[apiService] Response status: ${response.status} ${response.statusText}`);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// Check if response is actually JSON
			const contentType = response.headers.get('content-type');
			if (!contentType || !contentType.includes('application/json')) {
				const text = await response.text();
				throw new Error(`Non-JSON response: ${text}`);
			}

			const data = await response.json();
			console.log(`[apiService] Successfully fetched ${endpoint}, data length:`, Array.isArray(data) ? data.length : 'not array');

			// Cache the data
			this.cache.set(cacheKey, data);
			this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

			return trimNullStrings(data) as T;
		} catch (error) {
			console.error(`[apiService] Failed to fetch ${endpoint}:`, error);

			// Return cached data if available, even if expired
			if (this.cache.has(cacheKey)) {
				console.warn(`[apiService] Using expired cache for ${endpoint}`);
				return trimNullStrings(this.cache.get(cacheKey)) as T;
			}

			throw error;
		}
	}

	async getAllRoomTemplates(): Promise<RoomTemplate[]> {
		return this.fetchWithCache<RoomTemplate[]>('/api/templates/rooms');
	}

	async getRoomTemplateById(id: string): Promise<RoomTemplate | null> {
		try {
			return this.fetchWithCache<RoomTemplate>(`/api/templates/rooms/${id}`);
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
			return this.fetchWithCache<ShipLayout>(`/api/templates/ship-layouts/${id}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	async getAllGalaxyTemplates(): Promise<Galaxy[]> {
		return this.fetchWithCache<Galaxy[]>('/api/templates/galaxies');
	}

	async getAllStarSystemTemplates(): Promise<StarSystem[]> {
		return this.fetchWithCache<StarSystem[]>('/api/templates/star-systems');
	}

	async getDestinyStatusTemplate(): Promise<DestinyStatus> {
		return this.fetchWithCache<DestinyStatus>('/api/templates/destiny-status');
	}

	async getStartingInventory(): Promise<Inventory[]> {
		return this.fetchWithCache<Inventory[]>('/api/templates/starting-inventory');
	}

	async getTechnologyForRoom(templateID: string): Promise<RoomTechnology[]> {
		try {
			return this.fetchWithCache<RoomTechnology[]>(`/api/templates/room-technology/${templateID}`);
		} catch (error) {
			// If technology not found for this room type, return empty array
			if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not found'))) {
				console.log(`[apiService] No technology found for room type ${templateID}`);
				return [];
			}
			throw error;
		}
	}

	async getAllTechnologyTemplates(): Promise<TechnologyTemplate[]> {
		return this.fetchWithCache<TechnologyTemplate[]>('/api/templates/technology');
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
export const apiService = new APIService();
export default apiService;
