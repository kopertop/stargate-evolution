// Development-only verbose logging utility
export const debugLogger = {
	elevator: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`🛗 [ELEVATOR] ${message}`, data || '');
		}
	},
  
	npc: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`👤 [NPC] ${message}`, data || '');
		}
	},
  
	door: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`🚪 [DOOR] ${message}`, data || '');
		}
	},
  
	state: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`💾 [STATE] ${message}`, data || '');
		}
	},
  
	floor: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`🏢 [FLOOR] ${message}`, data || '');
		}
	},
  
	furniture: (message: string, data?: any) => {
		if (import.meta.env.DEV) {
			console.log(`🪑 [FURNITURE] ${message}`, data || '');
		}
	},
  
	// Helper to create test tools for browser console
	exposeTestTools: () => {
		if (import.meta.env.DEV && typeof window !== 'undefined') {
			(window as any).elevatorDebug = {
				logCurrentGameState: () => {
					console.log('=== ELEVATOR DEBUG TOOLS ===');
					console.log('Use these functions to debug:');
					console.log('- elevatorDebug.logRooms() - Show all rooms and their floors');
					console.log('- elevatorDebug.logDoors() - Show all doors and their connections');
					console.log('- elevatorDebug.logNPCs() - Show all NPCs and their positions');
					console.log('- elevatorDebug.logFurniture() - Show all furniture by floor');
				},
			};
		}
	},
};