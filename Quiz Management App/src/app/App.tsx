import React from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProvider } from "./store";
import { Toaster } from "sonner";

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="bottom-right" richColors />
    </AppProvider>
  );
}
