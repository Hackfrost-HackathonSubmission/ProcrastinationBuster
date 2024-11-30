import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "../src/app/components/Popup";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<Popup />);
