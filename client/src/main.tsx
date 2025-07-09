import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index.js";

// Make React available globally and assign to window before any JSX processing
(window as any).React = React;
globalThis.React = React;

// Ensure React is available for JSX transpilation
(window as any).jsx = React.createElement;

createRoot(document.getElementById("root")!).render(React.createElement(App));
