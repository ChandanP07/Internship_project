import { AccessControlProvider } from "@refinedev/core";

const getRole = (): string | null => {
  const localUser = localStorage.getItem("user");
  if (!localUser) return null;
  try {
    return JSON.parse(localUser)?.role ?? null;
  } catch {
    return null;
  }
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const role = getRole();

    if (!role) return { can: false };

    // Admin has full access
    if (role === "admin") return { can: true };

    // --- Users (Faculty) ---
    if (resource === "users") {
      if (role === "teacher") return { can: action === "list" || action === "show" };
      return { can: false };
    }

    // --- Departments ---
    if (resource === "departments") {
      if (role === "student") return { can: false };
      if (role === "teacher") return { can: action === "list" || action === "show" };
      return { can: false };
    }

    // --- Subjects ---
    if (resource === "subjects") {
      if (role === "student") return { can: false };
      if (role === "teacher") return { can: action === "list" || action === "show" };
      return { can: false };
    }

    // --- Classes ---
    if (resource === "classes") {
      if (action === "list" || action === "show") return { can: true };
      if (action === "create") return { can: role === "teacher" };
      if (action === "edit" || action === "delete") return { can: role === "teacher" };
      return { can: false };
    }

    // --- Enrollments ---
    if (resource === "enrollments") return { can: true };

    // --- Assignments ---
    if (resource === "assignments") {
      if (action === "list" || action === "show") return { can: true };
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: role === "teacher" };
      }
      return { can: false };
    }

    // --- Announcements ---
    if (resource === "announcements") {
      if (action === "list" || action === "show") return { can: true };
      if (action === "create" || action === "edit" || action === "delete") {
        return { can: role === "teacher" };
      }
      return { can: false };
    }

    // --- Submissions ---
    if (resource === "submissions") {
      if (action === "list" || action === "show") return { can: true };
      if (action === "create") return { can: role === "student" };
      if (action === "edit" || action === "delete") return { can: role === "teacher" };
      return { can: false };
    }

    return { can: true };
  },
};