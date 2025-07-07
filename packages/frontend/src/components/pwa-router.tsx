import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router';

import { isPWAMode } from '../utils/mobile-utils';

interface PWARouterProps {
  children: React.ReactNode;
}

/**
 * Component to handle PWA navigation and prevent breaking out of PWA context
 */
const PWANavigationHandler: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		// Only run in PWA mode
		if (!isPWAMode()) return;

		// Prevent navigation that might break out of PWA
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			// This helps prevent accidental navigation out of PWA
			e.preventDefault();
			return '';
		};

		// Handle popstate to ensure PWA context is maintained
		const handlePopState = (e: PopStateEvent) => {
			// Force stay within PWA context
			if (window.location.pathname !== location.pathname) {
				navigate(location.pathname, { replace: true });
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		window.addEventListener('popstate', handlePopState);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			window.removeEventListener('popstate', handlePopState);
		};
	}, [navigate, location.pathname]);

	useEffect(() => {
		// Force viewport meta tag update for iOS PWA
		if (isPWAMode() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
			const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
			if (viewport) {
				viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
			}
      
			// Ensure the app stays fullscreen
			const html = document.documentElement;
			const body = document.body;
      
			html.style.height = '100vh';
			html.style.overflow = 'hidden';
			body.style.height = '100vh';
			body.style.overflow = 'hidden';
			(body.style as any).webkitOverflowScrolling = 'touch';
		}
	}, []);

	return null;
};

/**
 * Enhanced BrowserRouter that maintains PWA context
 */
export const PWARouter: React.FC<PWARouterProps> = ({ children }) => {
	return (
		<BrowserRouter>
			<PWANavigationHandler />
			{children}
		</BrowserRouter>
	);
};