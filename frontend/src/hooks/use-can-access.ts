import { useGetIdentity } from "@refinedev/core";
import { User } from "@/types";

export function useCanAccess(resource: string, action: string): boolean {
  const { data: user } = useGetIdentity<User>();

  if (!user) return false;

  const { role } = user;

  // Admin has full access
  if (role === "admin") return true;

  // Resource-specific permissions
  if (resource === "users") {
    return role === "teacher" && action === "list" || action === "show";
  }

  if (resource === "departments") {
    return role === "teacher" && (action === "list" || action === "show");
  }

  if (resource === "subjects") {
    return role === "teacher" && (action === "list" || action === "show");
  }

  if (resource === "classes") {
    if (action === "list" || action === "show") return true;
    return role === "teacher" && (action === "create" || action === "edit" || action === "delete");
  }

  if (resource === "enrollments") {
    return true; // Custom routes handle specifics
  }

  if (resource === "assignments") {
    if (action === "list" || action === "show") return true;
    return role === "teacher" && (action === "create" || action === "edit" || action === "delete");
  }

  // Default - allow dashboard and other utility resources
  return true;
}