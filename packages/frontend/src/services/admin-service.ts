import { Room, RoomTemplate, TechnologyTemplate } from '@stargate/common';

import { apiClient } from './api-client';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

export class AdminService {

	// User management
	async getUsers() {
		const response = await apiClient.get('/api/admin/users', true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		// Ensure we always return an array
		return Array.isArray(data) ? data : [];
	}

	async updateUserAdmin(userId: string, isAdmin: boolean) {
		const response = await apiClient.patch(`/api/admin/users/${userId}`, { is_admin: isAdmin }, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Room Template management
	async getAllRoomTemplates(): Promise<RoomTemplate[]> {
		const response = await apiClient.get('/api/admin/room-templates', true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createRoomTemplate(templateData: any) {
		const response = await apiClient.post('/api/admin/room-templates', templateData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateRoomTemplate(templateId: string, templateData: any) {
		const response = await apiClient.put(`/api/admin/room-templates/${templateId}`, templateData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteRoomTemplate(templateId: string) {
		const response = await apiClient.delete(`/api/admin/room-templates/${templateId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Room management
	async getAllRooms(): Promise<Room[]> {
		const response = await apiClient.get('/api/data/rooms', false); // Public endpoint
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createRoom(roomData: Room) {
		const response = await apiClient.post('/api/admin/rooms', roomData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateRoom(roomId: string, roomData: any) {
		const response = await apiClient.put(`/api/admin/rooms/${roomId}`, roomData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteRoom(roomId: string) {
		const response = await apiClient.delete(`/api/admin/rooms/${roomId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Technology management
	async getAllTechnologyTemplates(): Promise<TechnologyTemplate[]> {
		const response = await apiClient.get('/api/data/technology', false); // Public endpoint
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createTechnology(techData: any) {
		const response = await apiClient.post('/api/admin/technologies', techData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateTechnology(techId: string, techData: any) {
		const response = await apiClient.put(`/api/admin/technologies/${techId}`, techData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteTechnology(techId: string) {
		const response = await apiClient.delete(`/api/admin/technologies/${techId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Room Technology management
	async setRoomTechnology(roomId: string, technologies: any[]) {
		const response = await apiClient.post('/api/admin/room-technology', { room_id: roomId, technologies }, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteRoomTechnology(techId: string) {
		const response = await apiClient.delete(`/api/admin/room-technology/${techId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Door management
	async getAllDoors() {
		const response = await apiClient.get('/api/admin/doors', true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createDoor(doorData: any) {
		const response = await apiClient.post('/api/admin/doors', doorData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateDoor(doorId: string, doorData: any) {
		const response = await apiClient.put(`/api/admin/doors/${doorId}`, doorData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteDoor(doorId: string) {
		const response = await apiClient.delete(`/api/admin/doors/${doorId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async getDoorsForRoom(roomId: string) {
		const response = await apiClient.get(`/api/admin/rooms/${roomId}/doors`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Room Furniture management
	async getAllFurniture() {
		const response = await apiClient.get('/api/admin/furniture', true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async getFurnitureForRoom(roomId: string) {
		const response = await apiClient.get(`/api/admin/rooms/${roomId}/furniture`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createFurniture(furnitureData: any) {
		const response = await apiClient.post('/api/admin/furniture', furnitureData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async updateFurniture(furnitureId: string, furnitureData: any) {
		const response = await apiClient.put(`/api/admin/furniture/${furnitureId}`, furnitureData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async deleteFurniture(furnitureId: string) {
		const response = await apiClient.delete(`/api/admin/furniture/${furnitureId}`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Room Template Furniture management
	async getRoomTemplateFurniture(templateId: string) {
		const response = await apiClient.get(`/api/admin/room-templates/${templateId}/furniture`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async getRoomTemplateTechnology(templateId: string) {
		const response = await apiClient.get(`/api/admin/room-templates/${templateId}/technology`, true);
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	// Furniture Templates management
	async getFurnitureTemplates() {
		const response = await apiClient.get('/api/data/furniture-templates', false); // Public endpoint
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}
	// Comprehensive template data export/import
	async exportAllTemplateData() {
		const response = await apiClient.get('/api/admin/templates/export', true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	async importAllTemplateData(templateData: any) {
		const response = await apiClient.post('/api/admin/templates/import', templateData, true);
		if (response.error) {
			throw new Error(response.error);
		}
		return response.data;
	}

	// Utility method to download template data as JSON file
	async downloadTemplateData() {
		try {
			const data = await this.exportAllTemplateData();

			// Create downloadable file
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			// Create download link
			const link = document.createElement('a');
			link.href = url;
			link.download = `stargate-templates-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			return data;
		} catch (error) {
			console.error('Failed to download template data:', error);
			throw error;
		}
	}

	// Utility method to upload template data from JSON file
	async uploadTemplateDataFromFile(file: File) {
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			return await this.importAllTemplateData(data);
		} catch (error) {
			console.error('Failed to upload template data:', error);
			throw error;
		}
	}
}

export const adminService = new AdminService();
