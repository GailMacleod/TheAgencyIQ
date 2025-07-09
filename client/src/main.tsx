import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index.js";

// Make React available globally
(window as any).React = React;
globalThis.React = React;

createRoot(document.getElementById("root")!).render(<App />);
