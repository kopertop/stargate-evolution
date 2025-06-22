import { getSession } from '../auth/session';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

class AdminService {
	private getAuthHeaders() {
		const session = getSession();
		if (!session?.token) {
			throw new Error('No authentication token available');
		}
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${session.token}`,
		};
	}

	// User management
	async getUsers() {
		const response = await fetch(`${API_URL}/api/admin/users`, {
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch users');
		}
		const data = await response.json();
		// Ensure we always return an array
		return Array.isArray(data) ? data : [];
	}

	async updateUserAdmin(userId: string, isAdmin: boolean) {
		const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
			method: 'PATCH',
			headers: this.getAuthHeaders(),
			body: JSON.stringify({ is_admin: isAdmin }),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update user');
		}
		return response.json();
	}

	// Room management
	async getAllRoomTemplates() {
		const response = await fetch(`${API_URL}/api/rooms/templates`, {
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch room templates');
		}
		const data = await response.json();
		return Array.isArray(data) ? data : [];
	}

	async createRoom(roomData: any) {
		const response = await fetch(`${API_URL}/api/admin/rooms`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(roomData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create room');
		}
		return response.json();
	}

	async updateRoom(roomId: string, roomData: any) {
		const response = await fetch(`${API_URL}/api/admin/rooms/${roomId}`, {
			method: 'PUT',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(roomData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update room');
		}
		return response.json();
	}

	async deleteRoom(roomId: string) {
		const response = await fetch(`${API_URL}/api/admin/rooms/${roomId}`, {
			method: 'DELETE',
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete room');
		}
		return response.json();
	}

	// Technology management
	async createTechnology(techData: any) {
		const response = await fetch(`${API_URL}/api/admin/technologies`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(techData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create technology');
		}
		return response.json();
	}

	async updateTechnology(techId: string, techData: any) {
		const response = await fetch(`${API_URL}/api/admin/technologies/${techId}`, {
			method: 'PUT',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(techData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update technology');
		}
		return response.json();
	}

	async deleteTechnology(techId: string) {
		const response = await fetch(`${API_URL}/api/admin/technologies/${techId}`, {
			method: 'DELETE',
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete technology');
		}
		return response.json();
	}

	// Room Technology management
	async setRoomTechnology(roomId: string, technologies: any[]) {
		const response = await fetch(`${API_URL}/api/admin/room-technology`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify({ room_id: roomId, technologies }),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to set room technology');
		}
		return response.json();
	}

	async deleteRoomTechnology(techId: string) {
		const response = await fetch(`${API_URL}/api/admin/room-technology/${techId}`, {
			method: 'DELETE',
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete room technology');
		}
		return response.json();
	}

	// Door management
	async getAllDoors() {
		const response = await fetch(`${API_URL}/api/admin/doors`, {
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch doors');
		}
		const data = await response.json();
		return Array.isArray(data) ? data : [];
	}

	async createDoor(doorData: any) {
		const response = await fetch(`${API_URL}/api/admin/doors`, {
			method: 'POST',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(doorData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create door');
		}
		return response.json();
	}

	async updateDoor(doorId: string, doorData: any) {
		const response = await fetch(`${API_URL}/api/admin/doors/${doorId}`, {
			method: 'PUT',
			headers: this.getAuthHeaders(),
			body: JSON.stringify(doorData),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update door');
		}
		return response.json();
	}

	async deleteDoor(doorId: string) {
		const response = await fetch(`${API_URL}/api/admin/doors/${doorId}`, {
			method: 'DELETE',
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete door');
		}
		return response.json();
	}

	async getDoorsForRoom(roomId: string) {
		const response = await fetch(`${API_URL}/api/admin/doors/room/${roomId}`, {
			headers: this.getAuthHeaders(),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch doors for room');
		}
		const data = await response.json();
		return Array.isArray(data) ? data : [];
	}
}

export const adminService = new AdminService();
