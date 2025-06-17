import type { RoomTechnology } from '@stargate/common/models/room-technology';
import type { TechnologyTemplate } from '@stargate/common/models/technology-template';

const API_BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8787';

export class ApiService {
	/**
	 * Fetch all technology templates for a specific room
	 */
	static async getRoomTechnology(templateId: string): Promise<RoomTechnology[]> {
		const response = await fetch(`${API_BASE_URL}/api/templates/room-technology/${templateId}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch room technology: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Fetch technology template by ID
	 */
	static async getTechnologyTemplate(technologyId: string): Promise<TechnologyTemplate> {
		const response = await fetch(`${API_BASE_URL}/api/templates/technology/${technologyId}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch technology template: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Fetch all technology templates
	 */
	static async getAllTechnologyTemplates(): Promise<TechnologyTemplate[]> {
		const response = await fetch(`${API_BASE_URL}/api/templates/technology`);
		if (!response.ok) {
			throw new Error(`Failed to fetch technology templates: ${response.statusText}`);
		}
		return response.json();
	}
}
