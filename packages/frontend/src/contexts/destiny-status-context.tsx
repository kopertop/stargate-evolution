import React, { createContext, useContext, useState } from 'react';

// Simple destiny status context without LiveStore - Admin-focused
// This context is kept minimal since we're focusing on Admin functionality

interface DestinyStatusContextType {
	// Placeholder context - most destiny functionality removed since we're focusing on Admin
	// If destiny functionality is needed later, it should use direct API calls instead of LiveStore
	status: any | null;
	setStatus: (status: any) => void;
}

const DestinyStatusContext = createContext<DestinyStatusContextType | undefined>(undefined);

export const DestinyStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [status, setStatus] = useState<any | null>(null);

	return (
		<DestinyStatusContext.Provider value={{
			status,
			setStatus,
		}}>
			{children}
		</DestinyStatusContext.Provider>
	);
};

export const useDestinyStatus = () => {
	const context = useContext(DestinyStatusContext);
	if (context === undefined) {
		throw new Error('useDestinyStatus must be used within a DestinyStatusProvider');
	}
	return context;
};
