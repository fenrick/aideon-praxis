import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './workspace';
import './styles.css';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to locate root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
