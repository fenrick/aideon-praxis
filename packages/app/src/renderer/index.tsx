import React from 'react';
import { createRoot } from 'react-dom/client';
import './tauri-shim';
import App from './app';

const container = document.querySelector('#root');
if (!container) {
  throw new Error('Root container #root not found');
}
const root = createRoot(container);
root.render(<App />);
