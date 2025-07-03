import type { DestinyStatus } from '@stargate/common';

import { apiClient } from './api-client';

export class DestinyService {
	static async getDestinyStatus(): Promise<DestinyStatus> {
		// This endpoint should be authenticated to get status for the current game
		const response = await apiClient.get('/destiny/status', true);

		if (response.error || !response.data) {
			throw new Error(response.error || 'Failed to fetch Destiny status');
		}

		return response.data;
	}
}
