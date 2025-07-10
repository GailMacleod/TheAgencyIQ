import React from "react";
import { createRoot } from "react-dom/client";
import MinimalApp from "./minimal-app";

// Ensure React is available globally
(window as any).React = React;

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(React.createElement(MinimalApp));
} else {
  console.error("Root element not found!");
}
