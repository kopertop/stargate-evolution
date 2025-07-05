import { API_BASE_URL } from '../config';
import { getSession } from '../auth/session';

export interface UploadResponse {
	success: boolean;
	url: string;
	filename: string;
	key: string;
}

export class UploadService {
	private apiBaseUrl: string;

	constructor() {
		this.apiBaseUrl = API_BASE_URL;
	}

	/**
	 * Get authentication headers for requests
	 */
	private getAuthHeaders(): Record<string, string> {
		const session = getSession();
		if (!session?.token) {
			throw new Error('No authentication token available');
		}
		return {
			'Authorization': `Bearer ${session.token}`,
		};
	}

	/**
	 * Upload an image file to CloudFlare R2 storage
	 */
	async uploadImage(file: File, folder: string = 'furniture'): Promise<UploadResponse> {
		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw new Error('File must be an image');
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			throw new Error('File size must be less than 10MB');
		}

		// Create FormData
		const formData = new FormData();
		formData.append('file', file);
		formData.append('folder', folder);
		formData.append('bucket', 'stargate-universe');

		try {
			const response = await fetch(`${this.apiBaseUrl}/api/upload/image`, {
				method: 'POST',
				body: formData,
				headers: this.getAuthHeaders(),
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
				throw new Error(errorData.message || `Upload failed with status ${response.status}`);
			}

			const result: UploadResponse = await response.json();
			return result;
		} catch (error) {
			console.error('Upload failed:', error);
			throw error;
		}
	}

	/**
	 * Delete an uploaded image from CloudFlare R2 storage
	 */
	async deleteImage(key: string): Promise<void> {
		try {
			const response = await fetch(`${this.apiBaseUrl}/api/upload/image/${encodeURIComponent(key)}`, {
				method: 'DELETE',
				headers: this.getAuthHeaders(),
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Delete failed' }));
				throw new Error(errorData.message || `Delete failed with status ${response.status}`);
			}
		} catch (error) {
			console.error('Delete failed:', error);
			throw error;
		}
	}

	/**
	 * Get the full URL for an uploaded image
	 */
	getImageUrl(key: string): string {
		// The URL will be returned by the upload endpoint
		// This method is for utility purposes if needed
		return key.startsWith('http') ? key : `https://r2.stargate-universe.example.com/${key}`;
	}
}

export const uploadService = new UploadService();