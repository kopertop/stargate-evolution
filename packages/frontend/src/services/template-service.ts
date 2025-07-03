import {
	Character,
	DoorTemplate,
	Galaxy,
	PersonTemplate,
	RaceTemplate,
	RoomFurniture,
	RoomTemplate,
	TechnologyTemplate,
} from '@stargate/common';

import { apiClient } from './api-client';

export class TemplateService {
	// Race templates
	async getRaces(): Promise<RaceTemplate[]> {
		const response = await apiClient.get('/api/templates/races', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Person templates
	async getPersons(): Promise<PersonTemplate[]> {
		const response = await apiClient.get('/api/templates/persons', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Galaxy templates
	async getGalaxies(): Promise<Galaxy[]> {
		const response = await apiClient.get('/api/templates/galaxies', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async getGalaxy(id: string): Promise<Galaxy> {
		const response = await apiClient.get(`/api/templates/galaxies/${id}`, false);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Room templates
	async getRooms(): Promise<RoomTemplate[]> {
		const response = await apiClient.get('/api/templates/rooms', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Door templates
	async getDoors(): Promise<DoorTemplate[]> {
		const response = await apiClient.get('/api/templates/doors', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async getDoorsForRoom(roomId: string): Promise<DoorTemplate[]> {
		const response = await apiClient.get(`/api/templates/doors/room/${roomId}`, false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Character templates
	async getCharacters(): Promise<Character[]> {
		const response = await apiClient.get('/api/templates/characters', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async getCharacter(id: string): Promise<Character> {
		const response = await apiClient.get(`/api/templates/characters/${id}`, false);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Technology templates
	async getTechnologies(): Promise<TechnologyTemplate[]> {
		// Assuming this is a public endpoint based on admin-service
		const response = await apiClient.get('/api/templates/technology', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Furniture templates
	async getFurniture(): Promise<RoomFurniture[]> {
		const response = await apiClient.get('/api/templates/furniture', false);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}
}

export const templateService = new TemplateService();
