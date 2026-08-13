import type { UserRole } from "@/auth/domain/user-role";
import { logger } from "@/shared/infrastructure/logging/logger";

type AuthenticatedPrincipal = Readonly<{
  id: string;
  role: UserRole;
}>;

export function logAuthenticationSucceeded(user: AuthenticatedPrincipal): void {
  logger.info("authentication_succeeded", "User authentication succeeded.", {
    userId: user.id,
    role: user.role,
  });
}

export function logAuthenticationFailed(): void {
  logger.warn("authentication_failed", "User authentication failed.");
}
