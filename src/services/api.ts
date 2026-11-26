
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "attendance_token";

// ============================================================
// AUTH TOKEN
// ============================================================

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ============================================================
// API REQUEST
// ============================================================

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers = new Headers(options.headers);
    const token = getAuthToken();

    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 401) {
        clearAuthToken();
        window.dispatchEvent(new Event("auth:unauthorized"));
      }

      throw new Error(
        errorData?.message || `API Error: ${response.status}`
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to the server. Please check your connection and try again."
      );
    }

    throw error;
  }
}


//* ============================================================*
//* ATTENDANCE PERIOD LOCK
//* ============================================================*

export interface AttendancePeriodLock {
  startDate: string;
  endDate: string;
  previousPeriodUnlocked: boolean;
}

interface AttendancePeriodLockResponse {
  status: string;
  message?: string;
  period: AttendancePeriodLock;
}

export async function getPreviousAttendancePeriod(): Promise<AttendancePeriodLock> {
  const response = await apiRequest<AttendancePeriodLockResponse>(
    "/attendance-period/previous"
  );

  return response.period;
}

export async function setPreviousAttendancePeriodLock(
  unlocked: boolean
): Promise<AttendancePeriodLock> {
  const response = await apiRequest<AttendancePeriodLockResponse>(
    "/attendance-period/previous",
    {
      method: "PATCH",
      body: JSON.stringify({ unlocked }),
    }
  );

  return response.period;
}


// ============================================================
// AUTHENTICATION
// ============================================================

export interface Department {
  id: number;
  name: string;
}

export async function getDepartments(): Promise<Department[]> {
  const response = await apiRequest<{
    status: string;
    data: Department[];
  }>("/departments");

  return response.data;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role:
    | "SUPER_ADMIN"
    | "MANAGER"
    | "ATTENDANCE_OFFICER"
    | "VISITOR";
  departmentId: number | null;
}

export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "ATTENDANCE_OFFICER"
  | "VISITOR";

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
  department?: Department | null;
}

interface LoginResponse {
  status: string;
  token: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setAuthToken(response.token);

  return response.user;
}

export function logout(): void {
  clearAuthToken();
}

// ============================================================
// EMPLOYEES
// ============================================================

export interface Employee {
  id: number;
  name: string;
  departmentId: number;
  isActive: boolean;
  department: Department;
}

export async function getEmployees(
  includeInactive = false,
  startDate?: string,
  endDate?: string
): Promise<Employee[]> {
  const params = new URLSearchParams();

  params.set("includeInactive", String(includeInactive));

  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  const query = params.toString();

  const response = await apiRequest<{
    status: string;
    data: Employee[];
  }>(`/employees${query ? `?${query}` : ""}`);

  return response.data;
}

// ============================================================
// ATTENDANCE INTERVALS
// ============================================================

export interface AttendanceInterval {
  id: number;
  attendanceId: number;
  groupId: string;
  startMinute: number;
  endMinute: number;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  value: string;
  intervals: AttendanceInterval[];
  employee?: Employee;
}

interface AttendanceResponse {
  status: string;
  data: AttendanceRecord[];
}

interface AttendanceIntervalResponse {
  status: string;
  data: AttendanceInterval[];
}

// GET ATTENDANCE

export async function getAttendance(
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await apiRequest<AttendanceResponse>(
    `/attendance?${params.toString()}`
  );

  return response.data;
}

// CREATE INTERVAL

export async function createAttendanceInterval(data: {
  employeeId: number;
  date: string;
  startMinute: number;
  endMinute: number;
}): Promise<AttendanceInterval[]> {
  const response = await apiRequest<AttendanceIntervalResponse>(
    "/attendance/intervals",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return response.data;
}

// UPDATE INTERVAL

export async function updateAttendanceInterval(
  groupId: string,
  data: {
    employeeId: number;
    date: string;
    startMinute: number;
    endMinute: number;
  }
): Promise<AttendanceInterval[]> {
  const response = await apiRequest<AttendanceIntervalResponse>(
    `/attendance/intervals/${groupId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );

  return response.data;
}

// DELETE INTERVAL

export async function deleteAttendanceInterval(
  groupId: string
): Promise<void> {
  await apiRequest(`/attendance/intervals/${groupId}`, {
    method: "DELETE",
  });
}

// ============================================================
// LEGACY ATTENDANCE FUNCTIONS
// Keep temporarily for components still using the old model.
// ============================================================

export async function saveAttendance(
  employeeId: number,
  date: string,
  value: string
): Promise<void> {
  await apiRequest("/attendance", {
    method: "POST",
    body: JSON.stringify({
      employeeId,
      date,
      value,
    }),
  });
}

export async function deleteAttendance(
  employeeId: number,
  date: string
): Promise<void> {
  await apiRequest(
    `/attendance?employeeId=${employeeId}&date=${date}`,
    {
      method: "DELETE",
    }
  );
}

export interface AttendanceChange {
  employeeId: number;
  date: string;
  value: string;
}

export async function saveAttendanceBatch(
  changes: AttendanceChange[]
): Promise<void> {
  await apiRequest("/attendance/batch", {
    method: "POST",
    body: JSON.stringify({ changes }),
  });
}

// ============================================================
// USER MANAGEMENT
// ============================================================

export async function getUsers(): Promise<ManagedUser[]> {
  const response = await apiRequest<{
    status: string;
    data: ManagedUser[];
  }>("/users");

  return response.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  departmentId: number | null;
}): Promise<void> {
  await apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: number,
  data: {
    name: string;
    email: string;
    role: UserRole;
    departmentId: number | null;
  }
): Promise<void> {
  await apiRequest(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changeUserStatus(
  id: number,
  isActive: boolean
): Promise<void> {
  await apiRequest(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function resetUserPassword(
  id: number,
  password: string
): Promise<void> {
  await apiRequest(`/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}
