import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/magazine.css";
import { App } from "./App";
import "./editor.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
