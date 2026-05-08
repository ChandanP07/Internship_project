import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

type UserRole = "student" | "teacher" | "admin";

/**
 * Middleware to require authentication.
 * Attaches the session user to req.user.
 * Optionally restricts to specific roles.
 */
export const requireAuth = (allowedRoles?: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      console.log(`[AuthMiddleware] URL: ${req.originalUrl}, Session Found: ${!!session?.user}`);

      if (!session || !session.user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "You must be logged in to access this resource.",
        });
      }

      // Attach user and session to request
      (req as any).user = session.user;
      (req as any).session = session.session;

      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = (session.user as any).role as UserRole;
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({
            error: "Forbidden",
            message: `Access denied. Required roles: ${allowedRoles.join(", ")}.`,
          });
        }
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to verify authentication.",
      });
    }
  };
};
