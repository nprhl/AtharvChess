import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface UserPermissions {
  permissions: string[];
  roles: Array<{
    role: string;
    scope?: string;
    expiresAt?: string;
  }>;
  scopes: string[];
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export interface PermissionContextType {
  permissions: UserPermissions | null;
  isLoading: boolean;
  error: Error | null;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string, scope?: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  canAccess: (resource: string, action?: string) => boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isCoach: boolean;
  isTeacher: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export interface PermissionProviderProps {
  children: React.ReactNode;
}

// Common permission constants for easy use throughout the app
export const PERMISSIONS = {
  // User management
  USER_VIEW_PII: 'user:view_pii',
  USER_EDIT_PROFILE: 'user:edit_profile', 
  USER_DELETE_ACCOUNT: 'user:delete_account',
  USER_ASSIGN_ROLES: 'user:assign_roles',
  
  // Organization management
  ORG_MANAGE: 'org:manage',
  ORG_VIEW_MEMBERS: 'org:view_members',
  ORG_INVITE_USERS: 'org:invite_users',
  
  // Tournament management
  TOURNAMENT_CREATE: 'tournament:create',
  TOURNAMENT_EDIT: 'tournament:edit',
  TOURNAMENT_VIEW_ALL: 'tournament:view_all',
  TOURNAMENT_MANAGE_PAIRINGS: 'tournament:manage_pairings',
  
  // System administration
  ADMIN_SYSTEM_CONFIG: 'admin:system_config',
  ADMIN_VIEW_LOGS: 'admin:view_logs',
  ADMIN_MANAGE_API_KEYS: 'admin:manage_api_keys',
  
  // AI features
  AI_ACCESS_ADVANCED: 'ai:access_advanced',
  AI_VIEW_ANALYTICS: 'ai:view_analytics',
  AI_CONFIGURE_ENGINES: 'ai:configure_engines'
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORGANIZER: 'organizer', 
  COACH: 'coach',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student'
};

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  const { 
    data: permissions, 
    isLoading, 
    error,
    refetch
  } = useQuery<UserPermissions>({
    queryKey: ['/api/rbac/me'],
    enabled: true, // Always try to fetch permissions
    retry: (failureCount, error: any) => {
      // Don't retry if user is not authenticated
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Helper functions
  const hasPermission = (permission: string): boolean => {
    if (!permissions?.permissions) return false;
    return permissions.permissions.includes(permission);
  };

  const hasRole = (role: string, scope?: string): boolean => {
    if (!permissions?.roles) {
      console.log('[PermissionContext] No roles available');
      return false;
    }
    
    // Handle both array of role objects and array of role strings
    const hasRoleInArray = permissions.roles.some(userRole => {
      // If userRole is a string, compare directly
      if (typeof userRole === 'string') {
        return userRole === role;
      }
      
      // If userRole is an object, check the role property
      if (typeof userRole === 'object' && userRole.role) {
        if (userRole.role !== role) return false;
        if (scope && userRole.scope !== scope) return false;
        
        // Check if role is expired
        if (userRole.expiresAt) {
          const expiry = new Date(userRole.expiresAt);
          if (expiry < new Date()) return false;
        }
        
        return true;
      }
      
      return false;
    });
    
    console.log(`[PermissionContext] Checking role '${role}':`, hasRoleInArray);
    return hasRoleInArray;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    console.log('[PermissionContext] Checking roles:', roles, 'against user roles:', permissions?.roles);
    return roles.some(role => hasRole(role));
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(permission => hasPermission(permission));
  };

  const canAccess = (resource: string, action?: string): boolean => {
    if (!permissions) return false;
    
    // Super admin can access everything
    if (hasRole(ROLES.SUPER_ADMIN)) return true;
    
    // Build permission string
    const permissionString = action ? `${resource}:${action}` : resource;
    
    return hasPermission(permissionString);
  };

  // Role convenience properties
  const isAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isOrganizer = hasRole(ROLES.ORGANIZER) || isAdmin;
  const isCoach = hasRole(ROLES.COACH) || isOrganizer;
  const isTeacher = hasRole(ROLES.TEACHER) || isCoach;

  const refreshPermissions = async (): Promise<void> => {
    await refetch();
  };

  const contextValue: PermissionContextType = {
    permissions: permissions ?? null,
    isLoading,
    error,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    canAccess,
    isAdmin,
    isOrganizer,
    isCoach,
    isTeacher,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Higher-order component for permission-based rendering
export interface RequirePermissionProps {
  permission?: string;
  role?: string;
  scope?: string;
  anyOf?: { permissions?: string[]; roles?: string[] };
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  role,
  scope,
  anyOf,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole, hasAnyRole, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  let hasAccess = true;

  // Check specific permission
  if (permission) {
    hasAccess = hasPermission(permission);
  }

  // Check specific role
  if (role && hasAccess) {
    hasAccess = hasRole(role, scope);
  }

  // Check anyOf conditions
  if (anyOf && hasAccess) {
    const hasAnyRequiredPermission = anyOf.permissions ? hasAnyPermission(anyOf.permissions) : true;
    const hasAnyRequiredRole = anyOf.roles ? hasAnyRole(anyOf.roles) : true;
    hasAccess = hasAnyRequiredPermission && hasAnyRequiredRole;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Hook for conditional rendering based on permissions
export const useConditionalRender = () => {
  const permissions = usePermissions();

  const renderIf = (
    condition: {
      permission?: string;
      role?: string;
      scope?: string;
      anyOf?: { permissions?: string[]; roles?: string[] };
    },
    component: React.ReactNode,
    fallback: React.ReactNode = null
  ): React.ReactNode => {
    if (permissions.isLoading) {
      return <div className="animate-pulse">Loading...</div>;
    }

    let hasAccess = true;

    if (condition.permission) {
      hasAccess = permissions.hasPermission(condition.permission);
    }

    if (condition.role && hasAccess) {
      hasAccess = permissions.hasRole(condition.role, condition.scope);
    }

    if (condition.anyOf && hasAccess) {
      const hasAnyRequiredPermission = condition.anyOf.permissions 
        ? permissions.hasAnyPermission(condition.anyOf.permissions) 
        : true;
      const hasAnyRequiredRole = condition.anyOf.roles 
        ? permissions.hasAnyRole(condition.anyOf.roles) 
        : true;
      hasAccess = hasAnyRequiredPermission && hasAnyRequiredRole;
    }

    return hasAccess ? component : fallback;
  };

  return { renderIf, ...permissions };
};

// Custom hook for navigation items with permission checking
export const useNavigationItems = () => {
  const permissions = usePermissions();

  const getVisibleItems = (items: Array<{
    id: string;
    label: string;
    path: string;
    icon?: React.ReactNode;
    permission?: string;
    role?: string;
    anyOf?: { permissions?: string[]; roles?: string[] };
  }>) => {
    return items.filter(item => {
      if (!item.permission && !item.role && !item.anyOf) return true;

      let hasAccess = true;

      if (item.permission) {
        hasAccess = permissions.hasPermission(item.permission);
      }

      if (item.role && hasAccess) {
        hasAccess = permissions.hasRole(item.role);
      }

      if (item.anyOf && hasAccess) {
        const hasAnyRequiredPermission = item.anyOf.permissions 
          ? permissions.hasAnyPermission(item.anyOf.permissions) 
          : true;
        const hasAnyRequiredRole = item.anyOf.roles 
          ? permissions.hasAnyRole(item.anyOf.roles) 
          : true;
        // For anyOf, user needs ANY of the required permissions OR roles (not both)
        hasAccess = hasAnyRequiredPermission || hasAnyRequiredRole;
      }

      return hasAccess;
    });
  };

  return { getVisibleItems, ...permissions };
};

console.log('[PermissionContext] Role-based permission system loaded');