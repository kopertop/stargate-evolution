import { apiClient } from './api-client';
export interface UploadResponse {
	success: boolean;
	url: string;
	filename: string;
	key: string;
}

export class UploadService {

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
			const response = await apiClient.postFormData('/api/upload/image', formData);

			if (response.error) {
				throw new Error(response.error);
			}

			const result: UploadResponse = response.data;
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
			const response = await apiClient.delete(`/api/upload/image/${encodeURIComponent(key)}`);

			if (response.error) {
				throw new Error(response.error);
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
