import type { ApiRoutes } from "@planner/server/src/app";
import { hc } from "hono/client";

export const apiClient = hc<ApiRoutes>("/api/v1");
