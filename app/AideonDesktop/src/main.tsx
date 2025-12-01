import React from 'react';
import ReactDOM from 'react-dom/client';

import { AideonDesktopRoot } from './root';
import './styles.css';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to locate root element');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AideonDesktopRoot />
  </React.StrictMode>,
);
