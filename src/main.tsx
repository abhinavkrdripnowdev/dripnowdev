import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logger } from './lib/logger';
import './styles/index.css';
import './styles/animations.css';
import './styles/dark-dashboards.css';
import './styles/dashboard-shell.css';
import { initTheme } from './lib/theme';

// Initialize Datadog Log Management for frontend API monitoring
logger.init();
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
