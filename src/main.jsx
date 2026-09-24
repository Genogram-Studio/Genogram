import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { EDITION } from "./edition.js";

document.documentElement.dataset.edition = EDITION;
createRoot(document.getElementById("root")).render(<App />);
