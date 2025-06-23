import type { RoomTechnology } from '@stargate/common/models/room-technology';
import type { TechnologyTemplate } from '@stargate/common/models/technology-template';

import { apiClient } from '../services/api-client';

export class ApiService {
	/**
	 * Fetch all technology templates for a specific room
	 */
	static async getRoomTechnology(templateId: string): Promise<RoomTechnology[]> {
		const response = await apiClient.get(`/api/templates/room-technology/${templateId}`, false); // Public endpoint
		if (response.error) {
			throw new Error(`Failed to fetch room technology: ${response.error}`);
		}
		return response.data;
	}

	/**
	 * Fetch technology template by ID
	 */
	static async getTechnologyTemplate(technologyId: string): Promise<TechnologyTemplate> {
		const response = await apiClient.get(`/api/templates/technology/${technologyId}`, false); // Public endpoint
		if (response.error) {
			throw new Error(`Failed to fetch technology template: ${response.error}`);
		}
		return response.data;
	}

	/**
	 * Fetch all technology templates
	 */
	static async getAllTechnologyTemplates(): Promise<TechnologyTemplate[]> {
		const response = await apiClient.get('/api/templates/technology', false); // Public endpoint
		if (response.error) {
			throw new Error(`Failed to fetch technology templates: ${response.error}`);
		}
		return response.data;
	}
}
