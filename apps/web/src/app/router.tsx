import { createBrowserRouter } from "react-router-dom";

import LandingPage from "@/pages/Landing";
import SignInPage from "@/pages/Auth/SignIn";
import SignUpPage from "@/pages/Auth/SignUp";
import ForgotPasswordPage from "@/pages/Auth/ForgotPassword";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/sign-up", element: <SignUpPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
]);
