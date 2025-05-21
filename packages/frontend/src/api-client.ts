import type { DestinyStatus } from '@stargate/common/types/destiny';
import { DestinyStatusSchema } from '@stargate/common/types/destiny';
import { GameSchema, GameSummaryListSchema } from '@stargate/common/types/game';
import {
	CreateGameRequestSchema,
	ListGamesRequestSchema,
	GetGameRequestSchema,
	CreateGameRequest,
	ListGamesRequest,
	GetGameRequest,
} from '@stargate/common/types/game-requests';
import type { ZodSchema } from 'zod';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

export class ApiError extends Error {
	constructor(message: string, public status?: number, public details?: any) {
		super(message);
	}
}

async function apiPost<Req, Res>(
	path: string,
	body: Req,
	requestSchema: ZodSchema<Req>,
	responseSchema: ZodSchema<Res>,
	token?: string,
): Promise<Res> {
	const parsedReq = requestSchema.safeParse(body);
	if (!parsedReq.success) {
		throw new ApiError('Invalid request', 400, parsedReq.error);
	}
	const res = await fetch(`${API_URL}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { 'Authorization': `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(parsedReq.data),
	});
	const text = await res.text();
	let json: any;
	try {
		json = JSON.parse(text);
	} catch {
		throw new ApiError('Invalid JSON response', res.status, text);
	}
	if (!res.ok) {
		throw new ApiError(json.error || 'API error', res.status, json.details);
	}
	const parsedRes = responseSchema.safeParse(json);
	if (!parsedRes.success) {
		throw new ApiError('Invalid response', res.status, parsedRes.error);
	}
	return parsedRes.data;
}

async function apiGet<Res>(path: string, responseSchema: ZodSchema<Res>, token?: string): Promise<Res> {
	const res = await fetch(`${API_URL}${path}`, {
		headers: token ? { 'Authorization': `Bearer ${token}` } : {},
	});
	const text = await res.text();
	let json: any;
	try {
		json = JSON.parse(text);
	} catch {
		throw new ApiError('Invalid JSON response', res.status, text);
	}
	if (!res.ok) {
		throw new ApiError(json.error || 'API error', res.status, json.details);
	}
	const parsedRes = responseSchema.safeParse(json);
	if (!parsedRes.success) {
		throw new ApiError('Invalid response', res.status, parsedRes.error);
	}
	return parsedRes.data;
}

// --- API functions ---

export async function createGame(
	params: CreateGameRequest,
	token: string,
) {
	return apiPost('/api/games', params, CreateGameRequestSchema, GameSchema, token);
}

export async function listGames(
	params: ListGamesRequest,
	token: string,
) {
	return apiPost('/api/games/list', params, ListGamesRequestSchema, GameSummaryListSchema, token);
}

export async function getGame(
	params: GetGameRequest,
	token: string,
) {
	return apiPost('/api/games/get', params, GetGameRequestSchema, GameSchema, token);
}

export async function getDestinyStatus(gameId: string, token?: string): Promise<DestinyStatus> {
	return apiGet(`/api/destiny-status?gameId=${encodeURIComponent(gameId)}`, DestinyStatusSchema, token);
}

export async function updateDestinyStatus(gameId: string, status: DestinyStatus, token?: string): Promise<void> {
	await apiPost(`/api/destiny-status?gameId=${encodeURIComponent(gameId)}`, status, DestinyStatusSchema, DestinyStatusSchema, token);
}
