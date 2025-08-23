import { useQuery } from "@tanstack/react-query";

export interface UserPermissions {
  permissions: string[];
  roles: string[];
  scopes: string[];
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export function usePermissions() {
  return useQuery({
    queryKey: ["/api/rbac/me"],
    queryFn: async (): Promise<UserPermissions> => {
      const response = await fetch("/api/rbac/me");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch permissions");
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useHasPermission(permission: string) {
  const { data: permissions } = usePermissions();
  return permissions?.permissions?.includes(permission) ?? false;
}

export function useHasRole(role: string) {
  const { data: permissions } = usePermissions();
  return permissions?.roles?.includes(role) ?? false;
}

export function useHasAnyRole(roles: string[]) {
  const { data: permissions } = usePermissions();
  return roles.some(role => permissions?.roles?.includes(role)) ?? false;
}

// Permission constants (matches server/rbac.ts)
export const PERMISSIONS = {
  // Tournament Management
  TOURNAMENT_CREATE: 'tournament:create',
  TOURNAMENT_EDIT: 'tournament:edit',
  TOURNAMENT_PUBLISH: 'tournament:publish',
  TOURNAMENT_DELETE: 'tournament:delete',
  TOURNAMENT_VIEW_PRIVATE: 'tournament:view_private',
  
  // Registration Management
  REGISTRATION_APPROVE: 'registration:approve',
  REGISTRATION_BULK_IMPORT: 'registration:bulk_import',
  REGISTRATION_VIEW_ALL: 'registration:view_all',
  REGISTRATION_MODIFY: 'registration:modify',
  REGISTRATION_EXPORT: 'registration:export',
  
  // Round Management
  ROUND_CREATE: 'round:create',
  ROUND_MODIFY: 'round:modify',
  ROUND_RESULT_ENTRY: 'round:result_entry',
  ROUND_RESULT_APPROVE: 'round:result_approve',
  ROUND_START: 'round:start',
  
  // User Management
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_VIEW_PII: 'user:view_pii',
  USER_ASSIGN_ROLES: 'user:assign_roles',
  USER_BULK_OPERATIONS: 'user:bulk_operations',
  
  // Organization Management
  ORG_MANAGE: 'org:manage',
  ORG_ROSTER: 'org:roster',
  ORG_ANALYTICS: 'org:analytics',
  ORG_BILLING: 'org:billing',
  
  // Appeals & Administration
  APPEAL_CREATE: 'appeal:create',
  APPEAL_REVIEW: 'appeal:review',
  ARBITER_OVERRIDE: 'arbiter:override',
  SYSTEM_ADMIN: 'system:admin',
} as const;