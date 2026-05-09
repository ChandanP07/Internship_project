import { createAuthClient } from "better-auth/react";
import { BACKEND_BASE_URL } from "../constants";

export const authClient = createAuthClient({
  // BACKEND_BASE_URL = "http://localhost:8000/api/"
  // Better Auth expects its own base URL (without /api/ prefix)
  baseURL: "http://localhost:8000",
  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        required: true,
        defaultValue: "student",
        input: true,
      },
      imageCldPubId: {
        type: "string" as const,
        required: false,
        input: true,
      },
    },
  },
});
