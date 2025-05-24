export class Toast {
	private static container: HTMLDivElement | null = null;

	static show(message: string, duration = 3000) {
		if (!Toast.container) {
			Toast.container = document.createElement('div');
			Toast.container.style.position = 'fixed';
			Toast.container.style.top = '32px';
			Toast.container.style.left = '50%';
			Toast.container.style.transform = 'translateX(-50%)';
			Toast.container.style.zIndex = '1000';
			Toast.container.style.display = 'flex';
			Toast.container.style.flexDirection = 'column';
			Toast.container.style.alignItems = 'center';
			document.body.appendChild(Toast.container);
		}
		const toast = document.createElement('div');
		toast.textContent = message;
		toast.style.background = 'rgba(30,30,40,0.95)';
		toast.style.color = '#fff';
		toast.style.padding = '12px 32px';
		toast.style.margin = '8px 0';
		toast.style.borderRadius = '8px';
		toast.style.fontSize = '1.1rem';
		toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
		toast.style.opacity = '1';
		toast.style.transition = 'opacity 0.5s';
		Toast.container.appendChild(toast);
		setTimeout(() => {
			toast.style.opacity = '0';
			setTimeout(() => {
				Toast.container?.removeChild(toast);
			}, 500);
		}, duration);
	}
}
