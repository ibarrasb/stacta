import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { configureAmplify } from "./lib/amplify";
import "./index.css";
import { fetchAuthSession } from "aws-amplify/auth";

(window as any).getAccessToken = async () => {
  const s = await fetchAuthSession();
  return s.tokens?.accessToken?.toString();
};

configureAmplify();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
