import React from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Banks } from "./pages/Banks";
import { Practice } from "./pages/Practice";
import { ExamConfig } from "./pages/ExamConfig";
import { ExamPlay } from "./pages/ExamPlay";
import { History } from "./pages/History";
import { Review } from "./pages/Review";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "banks", Component: Banks },
      { path: "practice", Component: Practice },
      { path: "exam/config", Component: ExamConfig },
      { path: "exam/play", Component: ExamPlay },
      { path: "history", Component: History },
      { path: "review/:id", Component: Review },
    ],
  },
]);
