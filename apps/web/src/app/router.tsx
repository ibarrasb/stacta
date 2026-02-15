import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";

import AppLayout from "@/routes/AppLayout";

import RequireAuth from "@/routes/RequireAuth";
import RedirectIfAuthed from "@/routes/RedirectIfAuthed";

// Lazy-load pages (code splitting)
const LandingPage = lazy(() => import("@/pages/Landing"));
const SignInPage = lazy(() => import("@/pages/Auth/SignIn"));
const SignUpPage = lazy(() => import("@/pages/Auth/SignUp"));
const ForgotPasswordPage = lazy(() => import("@/pages/Auth/ForgotPassword"));
const ConfirmSignUpPage = lazy(() => import("@/pages/Auth/ConfirmSignUp"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

const HomePage = lazy(() => import("@/pages/Home"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const SearchPage = lazy(() => import("@/pages/Search/index"));
const FragranceDetailPage = lazy(() => import("@/pages/Fragrances/FragranceDetail"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const UsersSearchPage = lazy(() => import("@/pages/Users/Search"));
const PublicProfilePage = lazy(() => import("@/pages/Users/PublicProfile"));

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
      {
        path: "/settings",
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      {
        path: "/users",
        element: (
          <RequireAuth>
            <UsersSearchPage />
          </RequireAuth>
        ),
      },
      {
        path: "/u/:username",
        element: (
          <RequireAuth>
            <PublicProfilePage />
          </RequireAuth>
        ),
      },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
