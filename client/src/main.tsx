import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index.js";

// Make React available globally FIRST
declare global {
  interface Window {
    React: typeof React;
  }
}
window.React = React;

// Now render the app
createRoot(document.getElementById("root")!).render(React.createElement(App));
