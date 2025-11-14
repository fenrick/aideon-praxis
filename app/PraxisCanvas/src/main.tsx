import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app';
import './styles.css';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to locate root element');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
