// Utility for Google Identity Services login
// Usage: import { renderGoogleSignInButton } from './auth/google-auth';

const GOOGLE_CLIENT_ID = '688478835170-eloiofvs1afuiqfflk44qevfphsfh5e6.apps.googleusercontent.com';

export type GoogleCredentialResponse = {
	credential: string;
	select_by: string;
};

/**
 * Renders the Google Sign-In button into the given container element.
 * @param containerId The DOM element ID to render the button into
 * @param onSuccess Callback with Google ID token (JWT) on successful login
 */
export function renderGoogleSignInButton(
	containerId: string,
	onSuccess: (idToken: string) => void,
) {
	if (!(window as any).google || !(window as any).google.accounts) {
		console.error('Google Identity Services script not loaded');
		return;
	}
	(window as any).google.accounts.id.initialize({
		client_id: GOOGLE_CLIENT_ID,
		callback: (response: GoogleCredentialResponse) => {
			onSuccess(response.credential);
		},
		ux_mode: 'popup',
	});
	(window as any).google.accounts.id.renderButton(
		document.getElementById(containerId),
		{
			theme: 'outline',
			size: 'large',
			text: 'continue_with',
			shape: 'pill',
		},
	);
}
