import { createRoot } from 'react-dom/client';
import React from 'react';
import './styles.css'; // Create this file for global styles
import App from './app';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = createRoot(rootElement);

root.render(React.createElement(App));
