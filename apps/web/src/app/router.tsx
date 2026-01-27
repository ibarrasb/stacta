// apps/web/src/app/router.tsx
import { createBrowserRouter } from "react-router-dom";

import AppLayout from "@/routes/AppLayout";

import LandingPage from "@/pages/Landing";
import SignInPage from "@/pages/Auth/SignIn";
import SignUpPage from "@/pages/Auth/SignUp";
import ForgotPasswordPage from "@/pages/Auth/ForgotPassword";
import ConfirmSignUpPage from "@/pages/Auth/ConfirmSignUp";
import NotFoundPage from "@/pages/NotFound";
import ProfilePage from "@/pages/Profile";
import SearchPage from "@/pages/Search/index";
import FragranceDetailPage from "@/pages/Fragrances/FragranceDetail";

// { path: "/search", element: <SearchPage /> },
// { path: "/fragrances/:id", element: <FragranceDetailPage /> },



import RequireAuth from "@/routes/RequireAuth";
import RedirectIfAuthed from "@/routes/RedirectIfAuthed";

// protected pages
import HomePage from "@/pages/Home";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
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
       {
        path: "/profile",
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: "/search",
        element: (
          <RequireAuth>
            <SearchPage />
          </RequireAuth>
        ),
      },
      {
        path: "/fragrances/:externalId",
        element: (
          <RequireAuth>
            <FragranceDetailPage />
          </RequireAuth>
        ),
      },
      


      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
