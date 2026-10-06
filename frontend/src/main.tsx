import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { logger } from './lib/logger';
import './styles/index.css';
import './styles/animations.css';

// Initialize Datadog Log Management for frontend API monitoring
logger.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
