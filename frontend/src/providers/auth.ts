import type { AuthProvider } from "@refinedev/core";
import { User, SignUpPayload } from "@/types";
import { authClient } from "@/lib/auth-client";

export const authProvider: AuthProvider = {
  register: async ({
    email,
    password,
    name,
    role,
    image,
    imageCldPubId,
  }: SignUpPayload) => {
    try {
      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password,
        image,
        role,
        imageCldPubId,
      } as any);

      if (error) {
        return {
          success: false,
          error: {
            name: "Registration failed",
            message:
              error?.message || "Unable to create account. Please try again.",
          },
        };
      }

      // Store user data in localStorage for quick access
      localStorage.setItem("user", JSON.stringify(data.user));

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error: {
          name: "Registration failed",
          message: "Unable to create account. Please try again.",
        },
      };
    }
  },

  login: async ({ email, password }) => {
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        console.error("Login error from auth client:", error);
        return {
          success: false,
          error: {
            name: "Login failed",
            message: error?.message || "Invalid email or password.",
          },
        };
      }

      // Store user data in localStorage for quick access
      localStorage.setItem("user", JSON.stringify(data.user));

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error) {
      console.error("Login exception:", error);
      return {
        success: false,
        error: {
          name: "Login failed",
          message: "Unable to connect to the server. Please try again later.",
        },
      };
    }
  },

  logout: async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("user");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  onError: async (error) => {
    if (error?.response?.status === 401 || error?.status === 401) {
      localStorage.removeItem("user");
      return {
        logout: true,
        redirectTo: "/login",
      };
    }
    return { error };
  },

  check: async () => {
    try {
      // Always verify the session against the server to avoid stale localStorage
      const { data: session } = await authClient.getSession();

      if (session?.user) {
        // Keep localStorage in sync
        localStorage.setItem("user", JSON.stringify(session.user));
        return { authenticated: true };
      }

      localStorage.removeItem("user");
      return {
        authenticated: false,
        logout: true,
        redirectTo: "/login",
        error: {
          name: "Unauthorized",
          message: "Your session has expired. Please log in again.",
        },
      };
    } catch (e) {
      // Network error — fall back to localStorage so offline state doesn't log user out
      const localUser = localStorage.getItem("user");
      if (localUser) {
        return { authenticated: true };
      }
      return {
        authenticated: false,
        logout: true,
        redirectTo: "/login",
        error: {
          name: "Unauthorized",
          message: "Unable to verify session.",
        },
      };
    }
  },

  getPermissions: async () => {
    // Prefer live session over localStorage
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        return { role: (session.user as any).role };
      }
    } catch (_) {}

    const localUser = localStorage.getItem("user");
    if (!localUser) return null;
    const parsedUser: User = JSON.parse(localUser);
    return { role: parsedUser.role };
  },

  getIdentity: async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        const u = session.user as any;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          role: u.role,
          imageCldPubId: u.imageCldPubId,
        };
      }
    } catch (_) {}

    const localUser = localStorage.getItem("user");
    if (!localUser) return null;
    const parsedUser: User = JSON.parse(localUser);
    return {
      id: parsedUser.id,
      name: parsedUser.name,
      email: parsedUser.email,
      image: parsedUser.image,
      role: parsedUser.role,
      imageCldPubId: parsedUser.imageCldPubId,
    };
  },
};
