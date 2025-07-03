import { getSession, validateOrRefreshSession } from '../auth/session';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

/**
 * Response wrapper for API calls
 */
export interface ApiResponse<T = any> {
	data?: T;
	error?: string;
	status: number;
}

/**
 * Centralized API client with automatic token refresh
 * Handles "Invalid token" errors and 401 responses automatically
 */
export class ApiClient {
	private static instance: ApiClient;

	private constructor() {}

	static getInstance(): ApiClient {
		if (!ApiClient.instance) {
			ApiClient.instance = new ApiClient();
		}
		return ApiClient.instance;
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
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${session.token}`,
		};
	}

	/**
	 * Check if response contains "Invalid token" error
	 */
	private async hasInvalidTokenError(response: Response): Promise<boolean> {
		if (response.status === 401) {
			return true;
		}

		// Check if response body contains "Invalid token" error
		try {
			const responseClone = response.clone();
			const data = await responseClone.json();
			return data.error === 'Invalid token';
		} catch {
			// If we can't parse as JSON, assume no token error
			return false;
		}
	}

	/**
	 * Make authenticated request with automatic token refresh
	 */
	async makeAuthenticatedRequest<T = any>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<ApiResponse<T>> {
		const url = `${API_URL}${endpoint}`;

		// First attempt with current token
		let requestOptions: RequestInit = {
			...options,
			headers: {
				...this.getAuthHeaders(),
				...options.headers,
			},
		};

		let response = await fetch(url, requestOptions);

		// Check if we need to refresh token
		if (await this.hasInvalidTokenError(response)) {
			console.log('Token invalid, attempting refresh...');

			try {
				const refreshedSession = await validateOrRefreshSession(API_URL);

				if (!refreshedSession?.token) {
					// Emit authentication error event for the auth context to handle
					window.dispatchEvent(new CustomEvent('auth-error', {
						detail: { error: 'Token refresh failed', status: 401 },
					}));

					return {
						error: 'Authentication failed - please log in again',
						status: 401,
					};
				}

				// Retry the request with the new token
				requestOptions = {
					...options,
					headers: {
						...options.headers,
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${refreshedSession.token}`,
					},
				};

				response = await fetch(url, requestOptions);
			} catch (refreshError) {
				console.error('Token refresh failed:', refreshError);

				// Emit authentication error event for the auth context to handle
				window.dispatchEvent(new CustomEvent('auth-error', {
					detail: { error: 'Token refresh failed', status: 401 },
				}));

				return {
					error: 'Token refresh failed - please log in again',
					status: 401,
				};
			}
		}

		// Parse response
		try {
			if (!response.ok) {
				const errorData = await response.json();
				return {
					error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
					status: response.status,
				};
			}

			const data = await response.json();
			return {
				data,
				status: response.status,
			};
		} catch (parseError) {
			return {
				error: 'Failed to parse response',
				status: response.status,
			};
		}
	}

	/**
	 * Make unauthenticated request (for public endpoints)
	 */
	async makeRequest<T = any>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<ApiResponse<T>> {
		const url = `${API_URL}${endpoint}`;

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					'Content-Type': 'application/json',
					...options.headers,
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				return {
					error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
					status: response.status,
				};
			}

			const data = await response.json();
			return {
				data,
				status: response.status,
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : 'Request failed',
				status: 0,
			};
		}
	}

	// Convenience methods for common HTTP verbs
	async get<T = any>(endpoint: string, authenticated = false): Promise<ApiResponse<T>> {
		return authenticated
			? this.makeAuthenticatedRequest<T>(endpoint, { method: 'GET' })
			: this.makeRequest<T>(endpoint, { method: 'GET' });
	}

	async post<T = any>(endpoint: string, data?: any, authenticated = true): Promise<ApiResponse<T>> {
		const options: RequestInit = {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
		};

		return authenticated
			? this.makeAuthenticatedRequest<T>(endpoint, options)
			: this.makeRequest<T>(endpoint, options);
	}

	async put<T = any>(endpoint: string, data?: any, authenticated = true): Promise<ApiResponse<T>> {
		const options: RequestInit = {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
		};

		return authenticated
			? this.makeAuthenticatedRequest<T>(endpoint, options)
			: this.makeRequest<T>(endpoint, options);
	}

	async patch<T = any>(endpoint: string, data?: any, authenticated = true): Promise<ApiResponse<T>> {
		const options: RequestInit = {
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined,
		};

		return authenticated
			? this.makeAuthenticatedRequest<T>(endpoint, options)
			: this.makeRequest<T>(endpoint, options);
	}

	async delete<T = any>(endpoint: string, authenticated = true): Promise<ApiResponse<T>> {
		return authenticated
			? this.makeAuthenticatedRequest<T>(endpoint, { method: 'DELETE' })
			: this.makeRequest<T>(endpoint, { method: 'DELETE' });
	}
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
