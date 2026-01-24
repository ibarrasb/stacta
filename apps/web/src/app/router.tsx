import { createBrowserRouter } from "react-router-dom";

import LandingPage from "@/pages/Landing";
import SignInPage from "@/pages/Auth/SignIn";
import SignUpPage from "@/pages/Auth/SignUp";
import ForgotPasswordPage from "@/pages/Auth/ForgotPassword";
import ConfirmSignUpPage from "@/pages/Auth/ConfirmSignUp";
import NotFoundPage from "@/pages/NotFound";

import RequireAuth from "@/routes/RequireAuth";
import RedirectIfAuthed from "@/routes/RedirectIfAuthed";

// protected pages
import HomePage from "@/pages/Home";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },

  // auth routes (if already signed in -> bounce to /home)
  {
    path: "/sign-in",
    element: (
      <RedirectIfAuthed>
        <SignInPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/sign-up",
    element: (
      <RedirectIfAuthed>
        <SignUpPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <RedirectIfAuthed>
        <ForgotPasswordPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/confirm",
    element: (
      <RedirectIfAuthed>
        <ConfirmSignUpPage />
      </RedirectIfAuthed>
    ),
  },

  // protected
  {
    path: "/home",
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    path: "/collection",
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },

  { path: "*", element: <NotFoundPage /> },
]);
