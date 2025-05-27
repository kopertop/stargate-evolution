// Template service for fetching game templates from backend API
// This service handles caching and provides a clean interface for template data

import {
	type RoomTemplate,
	type PersonTemplate,
	type RaceTemplate,
	type ShipLayoutTemplate,
	type DoorTemplate,
	RoomTemplatesResponseSchema,
	PersonTemplatesResponseSchema,
	RaceTemplatesResponseSchema,
	ShipLayoutsResponseSchema,
	DoorTemplatesResponseSchema,
} from '../schemas';

export interface ParsedShipLayout {
	id: string;
	name: string;
	description?: string;
	rooms: Array<{
		template_id: string;
		id?: string;
		position: { x: number; y: number; floor: number };
		initial_state: { found: boolean; locked: boolean; explored: boolean };
		connections: string[];
	}>;
	doors: Array<{
		from: string;
		to: string;
		template_id: string;
		initial_state: string;
		description?: string;
		requirements?: Array<{
			type: string;
			value: string;
			description: string;
			met: boolean;
		}>;
	}>;
}

class TemplateService {
	private baseUrl: string;
	private cache: Map<string, any> = new Map();
	private cacheExpiry: Map<string, number> = new Map();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	constructor(baseUrl?: string) {
		// Use environment variable if available, otherwise default to localhost
		this.baseUrl = baseUrl ||
			(typeof window !== 'undefined' && (window as any).ENV?.VITE_PUBLIC_API_URL) ||
			'http://localhost:8787';
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

			const apiResponse = await response.json();
			console.log('[TemplateService] API Response:', apiResponse);

			// Handle the new API response format with success/data structure
			if (apiResponse.success === false) {
				throw new Error(apiResponse.error || 'API request failed');
			}

			const data = apiResponse.data || apiResponse; // Fallback for old format
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

	async getAllShipLayouts(): Promise<ShipLayoutTemplate[]> {
		return this.fetchWithCache<ShipLayoutTemplate[]>('/api/templates/ship-layouts');
	}

	async getShipLayoutById(id: string): Promise<ParsedShipLayout | null> {
		try {
			const layout = await this.fetchWithCache<ShipLayoutTemplate>(`/api/templates/ship-layouts/${id}`);

			// The layout_data is already parsed by the backend Zod validation
			const layoutData = layout.layout_data;

			return {
				id: layout.id,
				name: layout.name,
				description: layout.description,
				rooms: layoutData.rooms,
				doors: layoutData.doors,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('404')) {
				return null;
			}
			throw error;
		}
	}

	async getAllDoorTemplates(): Promise<DoorTemplate[]> {
		return this.fetchWithCache<DoorTemplate[]>('/api/templates/doors');
	}

	// Helper methods for parsing JSON fields
	parseSkills(skillsJson: string): string[] {
		try {
			return JSON.parse(skillsJson);
		} catch {
			return [];
		}
	}

	parseTechnology(technologyJson: string): string[] {
		try {
			return JSON.parse(technologyJson);
		} catch {
			return [];
		}
	}

	parseLocation(locationJson: string): any {
		try {
			return JSON.parse(locationJson);
		} catch {
			return {};
		}
	}

	parseRequirements(requirementsJson: string): any[] {
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
