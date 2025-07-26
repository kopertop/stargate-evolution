import { vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
	value: sessionStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock navigator.standalone for iOS PWA detection
Object.defineProperty(window.navigator, 'standalone', {
	writable: true,
	value: false,
});

// Reset mocks before each test
beforeEach(() => {
	vi.clearAllMocks();

	// Reset localStorage mock to empty state
	const storage: Record<string, string> = {};
	localStorageMock.getItem.mockImplementation((key: string) => storage[key] || null);
	localStorageMock.setItem.mockImplementation((key: string, value: string) => {
		storage[key] = value;
	});
	localStorageMock.removeItem.mockImplementation((key: string) => {
		delete storage[key];
	});
	localStorageMock.clear.mockImplementation(() => {
		Object.keys(storage).forEach(key => delete storage[key]);
	});

	// Reset sessionStorage mock to empty state
	const sessionStorage: Record<string, string> = {};
	sessionStorageMock.getItem.mockImplementation((key: string) => sessionStorage[key] || null);
	sessionStorageMock.setItem.mockImplementation((key: string, value: string) => {
		sessionStorage[key] = value;
	});
	sessionStorageMock.removeItem.mockImplementation((key: string) => {
		delete sessionStorage[key];
	});
	sessionStorageMock.clear.mockImplementation(() => {
		Object.keys(sessionStorage).forEach(key => delete sessionStorage[key]);
	});
});
