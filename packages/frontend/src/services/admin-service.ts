import { RoomTemplate, TechnologyTemplate } from '@stargate/common';

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

	// Room management
	async getAllRoomTemplates(): Promise<RoomTemplate[]> {
		const response = await apiClient.get('/api/templates/rooms', false); // Public endpoint
		if (response.error) {
			throw new Error(response.error);
		}
		const data = response.data;
		return Array.isArray(data) ? data : [];
	}

	async createRoom(roomData: any) {
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
		const response = await apiClient.get('/api/templates/technology', false); // Public endpoint
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
}

export const adminService = new AdminService();
