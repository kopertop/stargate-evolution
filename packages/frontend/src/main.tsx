import React from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import { App } from './app';

declare global {
	interface ImportMeta {
		readonly env: Record<string, string>;
	}
}

const container = document.getElementById('root') || document.body;
const root = createRoot(container);

root.render(<App />);
