import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.scss';
import App from './app';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);

root.render(<App />);
