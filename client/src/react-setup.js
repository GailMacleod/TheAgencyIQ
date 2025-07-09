// React global setup - must be loaded first
import React from 'react';
import { createRoot } from 'react-dom/client';

// Assign React to window immediately
window.React = React;
window.ReactDOM = { createRoot };

// Export for other modules
export { React, createRoot };