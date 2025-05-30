import type { RoomTemplate } from './models/room-template';
import { nullToUndefined, type NullToUndefined } from './null-to-undefined';

export type RoomEventData = NullToUndefined<Omit<RoomTemplate, 'id' | 'created_at' | 'updated_at'>>;

export function roomTemplateToEvent(room: RoomTemplate): RoomEventData {
	const { id: _id, created_at: _created_at, updated_at: _updated_at, ...rest } = room;
	return nullToUndefined(rest);
}
