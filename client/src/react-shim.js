// React shim for global availability
import React from 'react';
import { createRoot } from 'react-dom/client';

// Make React available globally
globalThis.React = React;
globalThis.ReactDOM = { createRoot };

// Export for module usage
export { React, createRoot };