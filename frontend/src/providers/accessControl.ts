import { AccessControlProvider } from "@refinedev/core";

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    // Attempt to get user role from localStorage
    const localUser = localStorage.getItem("user");
    if (!localUser) {
      // If no user in storage, deny everything by default except public routes
      return { can: false };
    }

    try {
      const user = JSON.parse(localUser);
      const role = user.role;

      // Admin has full access to everything
      if (role === "admin") {
        return { can: true };
      }

      // --- Users (Faculty) Module ---
      if (resource === "users") {
        // Teachers can view the faculty directory (list/show)
        if (role === "teacher") {
          return { can: action === "list" || action === "show" };
        }
        // Students have no access to users module
        return { can: false };
      }

      // --- Departments Module ---
      if (resource === "departments") {
        // Students have no access to departments
        if (role === "student") {
          return { can: false };
        }
        // Teachers can only view
        if (role === "teacher") {
          return { can: action === "list" || action === "show" };
        }
        return { can: false };
      }

      // --- Subjects Module ---
      if (resource === "subjects") {
        // Students have no access to subjects list directly
        if (role === "student") {
          return { can: false };
        }
        // Teachers can viewed shared subjects
        if (role === "teacher") {
          return { can: action === "list" || action === "show" };
        }
        return { can: false };
      }

      // --- Classes Module ---
      if (resource === "classes") {
        // Everyone can see individual classes they are part of
        if (action === "list" || action === "show") {
          return { can: true };
        }
        
        // Only teachers can create classes
        if (action === "create") {
          return { can: role === "teacher" };
        }

        // Only teachers/admin can edit/delete (ownership handled by backend)
        if (action === "edit" || action === "delete") {
          return { can: role === "teacher" };
        }
        return { can: false };
      }

      // --- Enrollments Module ---
      if (resource === "enrollments") {
        return { can: true }; // Custom routes and backend handle specifics
      }

      // Dashboard and other utility resources
      return { can: true };
    } catch (e) {
      console.error("[AccessControl] Error parsing user from localStorage:", e);
      return { can: false };
    }
  },
};
