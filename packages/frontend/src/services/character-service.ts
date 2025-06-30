import { Character, Skill } from '@stargate/common';

import { apiClient } from './api-client';

class CharacterService {

	async createCharacter(characterData: Omit<Character, 'id' | 'created_at' | 'updated_at'>) {
		const response = await apiClient.post('/api/admin/characters', characterData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async getCharacter(characterId: string) {
		const response = await apiClient.get(`/api/admin/characters/${characterId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async getAllCharacters() {
		const response = await apiClient.get('/api/admin/characters', true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async updateCharacter(characterId: string, characterData: Partial<Character>) {
		const response = await apiClient.put(`/api/admin/characters/${characterId}`, characterData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async gainExperience(characterId: string, xp: number): Promise<Character> {
		const response = await apiClient.post(`/api/game/character/${characterId}/gain-xp`, { xp });
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateCharacterSkill(characterId: string, skillName: string, levelChange: number, experienceChange: number): Promise<Character> {
		const response = await apiClient.post(`/api/game/character/${characterId}/update-skill`, { skillName, levelChange, experienceChange });
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteCharacter(characterId: string) {
		const response = await apiClient.delete(`/api/admin/characters/${characterId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}
}

export const characterService = new CharacterService();
