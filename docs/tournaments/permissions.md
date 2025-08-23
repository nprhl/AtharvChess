# Tournament System Permissions Matrix

## Role-Based Access Control (RBAC)

This document defines the permissions and access levels for each user role in the tournament system.

## Permission Categories

### Tournament Management
- `tournament:create` - Create new tournaments
- `tournament:edit` - Modify tournament settings
- `tournament:publish` - Make tournaments public
- `tournament:delete` - Remove tournaments
- `tournament:view_private` - Access draft/private tournaments

### Registration Management
- `registration:approve` - Approve/reject registrations
- `registration:bulk_import` - Import player rosters
- `registration:view_all` - See all registrations
- `registration:modify` - Edit registration details
- `registration:export` - Export registration data

### Round Management
- `round:create` - Generate pairings
- `round:modify` - Adjust pairings
- `round:result_entry` - Enter game results
- `round:result_approve` - Finalize results
- `round:start` - Begin rounds

### User Management
- `user:create` - Add new users
- `user:edit` - Modify user profiles
- `user:view_pii` - Access personal information
- `user:assign_roles` - Grant/revoke permissions
- `user:bulk_operations` - Mass user operations

### School/Organization
- `org:manage` - Manage school/club settings
- `org:roster` - Manage student rosters
- `org:analytics` - View organizational reports
- `org:billing` - Handle payments/billing

### Appeals & Administration
- `appeal:create` - File appeals/protests
- `appeal:review` - Review and resolve appeals
- `arbiter:override` - Override system decisions
- `system:admin` - System-wide administration

## Role Permission Matrix

| Permission | Super Admin | Organizer | Coach | Teacher | Parent | Student |
|------------|-------------|-----------|--------|---------|--------|---------|
| **Tournament Management** |
| tournament:create | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| tournament:edit | ✅ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| tournament:publish | ✅ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| tournament:delete | ✅ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| tournament:view_private | ✅ | ✅ (own) | ❌ | ❌ | ❌ | ❌ |
| **Registration Management** |
| registration:approve | ✅ | ✅ | ❌ | ✅ (school only) | ❌ | ❌ |
| registration:bulk_import | ✅ | ✅ | ❌ | ✅ (school only) | ❌ | ❌ |
| registration:view_all | ✅ | ✅ | ✅ (team only) | ✅ (school only) | ❌ | ❌ |
| registration:modify | ✅ | ✅ | ✅ (team only) | ✅ (school only) | ✅ (child only) | ❌ |
| registration:export | ✅ | ✅ | ✅ (team only) | ✅ (school only) | ❌ | ❌ |
| **Round Management** |
| round:create | ✅ | ✅ (own tournaments) | ❌ | ❌ | ❌ | ❌ |
| round:modify | ✅ | ✅ (own tournaments) | ❌ | ❌ | ❌ | ❌ |
| round:result_entry | ✅ | ✅ | ✅ (as arbiter) | ✅ (as arbiter) | ❌ | ✅ (own games) |
| round:result_approve | ✅ | ✅ | ✅ (as arbiter) | ✅ (as arbiter) | ❌ | ❌ |
| round:start | ✅ | ✅ (own tournaments) | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| user:create | ✅ | ❌ | ❌ | ✅ (students only) | ❌ | ❌ |
| user:edit | ✅ | ❌ | ✅ (team only) | ✅ (school only) | ✅ (child only) | ✅ (self only) |
| user:view_pii | ✅ | ✅ (participants) | ✅ (team only) | ✅ (school only) | ✅ (child only) | ✅ (self only) |
| user:assign_roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| user:bulk_operations | ✅ | ✅ (participants) | ❌ | ✅ (school only) | ❌ | ❌ |
| **School/Organization** |
| org:manage | ✅ | ❌ | ❌ | ✅ (own school) | ❌ | ❌ |
| org:roster | ✅ | ❌ | ✅ (team only) | ✅ (school only) | ❌ | ❌ |
| org:analytics | ✅ | ✅ (tournaments) | ✅ (team only) | ✅ (school only) | ✅ (child only) | ✅ (self only) |
| org:billing | ✅ | ✅ (tournaments) | ❌ | ✅ (school only) | ✅ (child only) | ❌ |
| **Appeals & Administration** |
| appeal:create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| appeal:review | ✅ | ✅ (own tournaments) | ❌ | ❌ | ❌ | ❌ |
| arbiter:override | ✅ | ✅ (own tournaments) | ❌ | ❌ | ❌ | ❌ |
| system:admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Scope Restrictions

### Data Access Limitations

**Organizer Scope:**
- Can only manage tournaments they created
- Can view/modify registrations for their tournaments
- Cannot access other organizers' tournament data

**Coach Scope:**
- Limited to their assigned team/players
- Cannot access other teams' private data
- Can view aggregated performance across tournaments

**Teacher Scope:**
- Limited to their school's students
- Cannot access students from other schools
- Can manage school-wide tournament participation

**Parent Scope:**
- Strictly limited to their child's data
- Cannot access other children's information
- Can view child's performance history and schedules

**Student Scope:**
- Can only access their own data
- Can view public tournament information
- Cannot access other students' private data

### Resource-Based Permissions

#### Tournament Resources
```typescript
// Example permission check
if (user.role === 'organizer' && tournament.organizerId === user.id) {
  // Can modify tournament
}
```

#### School Resources
```typescript
// Teachers can only manage their school
if (user.role === 'teacher' && user.schoolId === targetUser.schoolId) {
  // Can manage student
}
```

#### Team Resources
```typescript
// Coaches can only manage their teams
if (user.role === 'coach' && user.teamIds.includes(targetUser.teamId)) {
  // Can manage team member
}
```

## Special Permission Rules

### Cross-Role Permissions
1. **Emergency Override**: Super Admin can override any permission
2. **Arbiter Mode**: Teachers/Coaches can be granted temporary arbiter permissions during tournaments
3. **Parent Proxy**: Parents can act on behalf of minor children for registrations
4. **School Admin**: Head teachers get elevated permissions within their school

### Time-Based Permissions
1. **Registration Window**: Registration permissions only active during open periods
2. **Round Active**: Result entry permissions only during round windows
3. **Appeal Period**: Appeal creation limited to 24 hours post-round
4. **Archival**: Most modification permissions removed after tournament archival

### Dynamic Permission Assignment
```typescript
// Temporary arbiter assignment
const assignArbiterRole = async (userId: number, tournamentId: number) => {
  await grantTemporaryPermission(userId, 'round:result_approve', {
    scope: `tournament:${tournamentId}`,
    expiresAt: tournamentEndDate
  });
};
```

## Permission Enforcement

### API Level
- Every endpoint protected by middleware
- Permission checks before data access
- Scope validation for resource access
- Audit logging for sensitive operations

### UI Level
- Component-level permission rendering
- Dynamic menu generation based on permissions
- Form field disabling for read-only users
- Feature flagging for role-specific functionality

### Database Level
- Row-level security policies
- Foreign key constraints enforcing ownership
- Audit trails for data modifications
- Soft deletes for sensitive operations

## Permission Implementation

### Middleware Example
```typescript
const requirePermission = (permission: string, scope?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const hasPermission = await checkUserPermission(user.id, permission, scope);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

### Database Schema
```sql
-- Role assignments
CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id),
  role VARCHAR NOT NULL,
  scope VARCHAR, -- 'global', 'school:123', 'tournament:456'
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP
);

-- Permission cache for performance
CREATE TABLE user_permissions_cache (
  user_id INTEGER REFERENCES users(id),
  permission VARCHAR NOT NULL,
  scope VARCHAR,
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

### Data Protection
- PII access logging required
- Encryption for sensitive data
- Regular permission audits
- Principle of least privilege

### Child Protection (COPPA Compliance)
- Parent consent for children under 13
- Limited data collection for minors
- Enhanced privacy controls
- Secure communication channels

### Anti-Abuse Measures
- Rate limiting on permission changes
- Multi-factor authentication for admin roles
- Session management and timeout
- Suspicious activity detection

---

*This permissions matrix ensures proper data security while enabling appropriate access for each user role. Regular reviews and updates maintain system security as features evolve.*