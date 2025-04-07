import { z } from 'zod';
import { Room, RoomTheme } from '../../types';

// Room props interface
export interface RoomProps {
	theme: RoomTheme;
	stargateActive?: boolean;
	children?: React.ReactNode;
}

// Stargate room props
export interface StargateRoomProps {
	planet: string;
	updateLocation: (planet: string, location: string) => void;
	setIsInWormhole: (isInWormhole: boolean) => void;
	startTravel: () => void;
}

// Environment controller props
export interface EnvironmentControllerProps {
	currentRoom: Room;
	onRoomChange?: (roomId: string) => void;
}
