import type { AuthUser } from "../services/api";

export function getUserPermissions(user: AuthUser) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isManager = user.role === "MANAGER";
  const isAttendanceOfficer = user.role === "ATTENDANCE_OFFICER";

  return {
    canManageUsers: isSuperAdmin,

    canManageDepartments: isSuperAdmin,

    canManageEmployees: isSuperAdmin || isManager,

    canEditAttendance: isSuperAdmin || isAttendanceOfficer,

    canExportAttendance:
      isSuperAdmin || isManager || isAttendanceOfficer,

    canViewAllDepartments:
      isSuperAdmin || isManager || user.role === "VISITOR",

    canOverrideDeadline: isSuperAdmin,
  };
}