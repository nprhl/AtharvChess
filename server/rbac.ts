import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { userRoles, users, organizations, teams } from '../shared/schema.js';
import { eq, and, or } from 'drizzle-orm';

// Permission definitions
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

// Role definitions with their permissions
export const ROLE_PERMISSIONS = {
  super_admin: [
    PERMISSIONS.TOURNAMENT_CREATE,
    PERMISSIONS.TOURNAMENT_EDIT,
    PERMISSIONS.TOURNAMENT_PUBLISH,
    PERMISSIONS.TOURNAMENT_DELETE,
    PERMISSIONS.TOURNAMENT_VIEW_PRIVATE,
    PERMISSIONS.REGISTRATION_APPROVE,
    PERMISSIONS.REGISTRATION_BULK_IMPORT,
    PERMISSIONS.REGISTRATION_VIEW_ALL,
    PERMISSIONS.REGISTRATION_MODIFY,
    PERMISSIONS.REGISTRATION_EXPORT,
    PERMISSIONS.ROUND_CREATE,
    PERMISSIONS.ROUND_MODIFY,
    PERMISSIONS.ROUND_RESULT_ENTRY,
    PERMISSIONS.ROUND_RESULT_APPROVE,
    PERMISSIONS.ROUND_START,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.USER_ASSIGN_ROLES,
    PERMISSIONS.USER_BULK_OPERATIONS,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_ROSTER,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.APPEAL_CREATE,
    PERMISSIONS.APPEAL_REVIEW,
    PERMISSIONS.ARBITER_OVERRIDE,
    PERMISSIONS.SYSTEM_ADMIN,
  ],
  organizer: [
    PERMISSIONS.TOURNAMENT_CREATE,
    PERMISSIONS.TOURNAMENT_EDIT,
    PERMISSIONS.TOURNAMENT_PUBLISH,
    PERMISSIONS.TOURNAMENT_DELETE,
    PERMISSIONS.TOURNAMENT_VIEW_PRIVATE,
    PERMISSIONS.REGISTRATION_APPROVE,
    PERMISSIONS.REGISTRATION_BULK_IMPORT,
    PERMISSIONS.REGISTRATION_VIEW_ALL,
    PERMISSIONS.REGISTRATION_MODIFY,
    PERMISSIONS.REGISTRATION_EXPORT,
    PERMISSIONS.ROUND_CREATE,
    PERMISSIONS.ROUND_MODIFY,
    PERMISSIONS.ROUND_RESULT_ENTRY,
    PERMISSIONS.ROUND_RESULT_APPROVE,
    PERMISSIONS.ROUND_START,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.USER_BULK_OPERATIONS,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.APPEAL_CREATE,
    PERMISSIONS.APPEAL_REVIEW,
    PERMISSIONS.ARBITER_OVERRIDE,
  ],
  coach: [
    PERMISSIONS.REGISTRATION_VIEW_ALL,
    PERMISSIONS.REGISTRATION_MODIFY,
    PERMISSIONS.REGISTRATION_EXPORT,
    PERMISSIONS.ROUND_RESULT_ENTRY,
    PERMISSIONS.ROUND_RESULT_APPROVE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.ORG_ROSTER,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.APPEAL_CREATE,
  ],
  teacher: [
    PERMISSIONS.REGISTRATION_APPROVE,
    PERMISSIONS.REGISTRATION_BULK_IMPORT,
    PERMISSIONS.REGISTRATION_VIEW_ALL,
    PERMISSIONS.REGISTRATION_MODIFY,
    PERMISSIONS.REGISTRATION_EXPORT,
    PERMISSIONS.ROUND_RESULT_ENTRY,
    PERMISSIONS.ROUND_RESULT_APPROVE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.USER_BULK_OPERATIONS,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.ORG_ROSTER,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.APPEAL_CREATE,
  ],
  parent: [
    PERMISSIONS.REGISTRATION_MODIFY,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.APPEAL_CREATE,
  ],
  student: [
    PERMISSIONS.ROUND_RESULT_ENTRY,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_VIEW_PII,
    PERMISSIONS.ORG_ANALYTICS,
    PERMISSIONS.APPEAL_CREATE,
  ],
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Role = keyof typeof ROLE_PERMISSIONS;

// Scope validation helpers
export function validateScope(permission: Permission, scope: string | null, user: any, resourceId?: number): boolean {
  if (!scope) return true; // Global scope
  
  const [scopeType, scopeId] = scope.split(':');
  
  switch (scopeType) {
    case 'org':
      return user.schoolId === parseInt(scopeId);
    case 'tournament':
      // Check if user is organizer of this tournament or has permission within their org
      return true; // Implement tournament-specific checks
    case 'team':
      // Check if user is member or coach of this team
      return true; // Implement team-specific checks
    case 'user':
      return user.id === parseInt(scopeId);
    default:
      return false;
  }
}

// Permission checking utility
export async function hasPermission(userId: number, permission: Permission, scope?: string): Promise<boolean> {
  try {
    // Get user's roles
    const userRoleRecords = await db
      .select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.isActive, true)
      ));

    // Check if user has the permission through any of their roles
    for (const roleRecord of userRoleRecords) {
      // Check if role is expired
      if (roleRecord.expiresAt && roleRecord.expiresAt < new Date()) {
        continue;
      }

      // Check if scope matches (if provided)
      if (scope && roleRecord.scope && roleRecord.scope !== scope && !roleRecord.scope.startsWith('global')) {
        continue;
      }

      // Check if role has the permission
      const rolePermissions = ROLE_PERMISSIONS[roleRecord.role as Role];
      if (rolePermissions?.includes(permission as any)) {
        return true;
      }

      // Check if user has explicit permission
      if (roleRecord.permissions?.includes(permission as any)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Get user's effective permissions
export async function getUserPermissions(userId: number): Promise<{ permissions: Permission[], roles: string[], scopes: string[] }> {
  try {
    const userRoleRecords = await db
      .select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.isActive, true)
      ));

    const permissions = new Set<Permission>();
    const roles = new Set<string>();
    const scopes = new Set<string>();

    for (const roleRecord of userRoleRecords) {
      // Skip expired roles
      if (roleRecord.expiresAt && roleRecord.expiresAt < new Date()) {
        continue;
      }

      roles.add(roleRecord.role);
      if (roleRecord.scope) scopes.add(roleRecord.scope);

      // Add role permissions
      const rolePermissions = ROLE_PERMISSIONS[roleRecord.role as Role];
      if (rolePermissions) {
        rolePermissions.forEach(p => permissions.add(p as Permission));
      }

      // Add explicit permissions
      if (roleRecord.permissions) {
        roleRecord.permissions.forEach(p => permissions.add(p as Permission));
      }
    }

    return {
      permissions: Array.from(permissions),
      roles: Array.from(roles),
      scopes: Array.from(scopes)
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return { permissions: [], roles: [], scopes: [] };
  }
}

// Middleware for requiring specific permissions
export function requirePermission(permission: Permission, scope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAccess = await hasPermission(user.id, permission, scope);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          scope: scope 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Middleware for requiring specific roles
export function requireRole(role: Role, scope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoleRecords = await db
        .select()
        .from(userRoles)
        .where(and(
          eq(userRoles.userId, user.id),
          eq(userRoles.role, role),
          eq(userRoles.isActive, true)
        ));

      let hasValidRole = false;
      for (const roleRecord of userRoleRecords) {
        // Check if role is not expired
        if (roleRecord.expiresAt && roleRecord.expiresAt < new Date()) {
          continue;
        }

        // Check scope if provided
        if (scope && roleRecord.scope && roleRecord.scope !== scope) {
          continue;
        }

        hasValidRole = true;
        break;
      }

      if (!hasValidRole) {
        return res.status(403).json({ 
          error: 'Insufficient role privileges',
          required: role,
          scope: scope 
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Helper to assign role to user
export async function assignRole(userId: number, role: Role, scope?: string, grantedBy?: number, expiresAt?: Date): Promise<boolean> {
  try {
    await db.insert(userRoles).values({
      userId,
      role,
      scope: scope || 'global',
      grantedBy,
      expiresAt,
      isActive: true
    });
    
    return true;
  } catch (error) {
    console.error('Error assigning role:', error);
    return false;
  }
}

// Helper to revoke role from user
export async function revokeRole(userId: number, role: Role, scope?: string): Promise<boolean> {
  try {
    await db
      .update(userRoles)
      .set({ isActive: false })
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, role),
        scope ? eq(userRoles.scope, scope) : eq(userRoles.scope, 'global')
      ));
    
    return true;
  } catch (error) {
    console.error('Error revoking role:', error);
    return false;
  }
}

// Middleware to attach user permissions to request
export async function attachUserPermissions(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (user) {
    const { permissions, roles, scopes } = await getUserPermissions(user.id);
    (req as any).userPermissions = permissions;
    (req as any).userRoles = roles;
    (req as any).userScopes = scopes;
  }
  next();
}