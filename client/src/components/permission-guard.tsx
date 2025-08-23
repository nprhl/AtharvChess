import { ReactNode } from "react";
import { useHasPermission, useHasRole, useHasAnyRole } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  anyRole?: string[];
  fallback?: ReactNode;
}

export default function PermissionGuard({ 
  children, 
  permission, 
  role, 
  anyRole, 
  fallback = null 
}: PermissionGuardProps) {
  const hasPermission = useHasPermission(permission || "");
  const hasRole = useHasRole(role || "");
  const hasAnyRole = useHasAnyRole(anyRole || []);

  // Check conditions
  const hasAccess = 
    (permission && hasPermission) ||
    (role && hasRole) ||
    (anyRole && hasAnyRole) ||
    (!permission && !role && !anyRole); // No restrictions

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}