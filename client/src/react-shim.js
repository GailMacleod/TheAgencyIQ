// React Global Assignment for July 9th Configuration
import React from 'react';
import ReactDOM from 'react-dom/client';

// Make React globally available
globalThis.React = React;
globalThis.ReactDOM = ReactDOM;
window.React = React;
window.ReactDOM = ReactDOM;

export { React, ReactDOM };
export const { createRoot } = ReactDOM;