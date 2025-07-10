import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Ensure React is available globally
(window as any).React = React;

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(React.createElement(App));
} else {
  console.error("Root element not found!");
}
