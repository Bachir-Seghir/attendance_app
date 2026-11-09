
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "attendance_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

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

// AUTHENTICATION

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "ATTENDANCE_OFFICER" | "VISITOR";
  departmentId: number | null;
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

// EMPLOYEES

export interface Employee {
  id: number;
  name: string;
  departmentId: number;
  isActive: boolean;
  department: Department;
}

export async function getEmployees(
    includeInactive = false,
    month?: number,
    year?: number
): Promise<Employee[]> {
    const params = new URLSearchParams();

    if (includeInactive) {
        params.set("includeInactive", "true");
    }

    if (month !== undefined && year !== undefined) {
        params.set("month", String(month));
        params.set("year", String(year));
    }

    const query = params.toString();

    const response = await apiRequest<{
        status: string;
        data: Employee[];
    }>(`/employees${query ? `?${query}` : ""}`);

    return response.data;
}

// ATTENDANCE

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  value: string;
}

export async function getAttendance(
  month: number,
  year: number
): Promise<AttendanceRecord[]> {
  const response = await apiRequest<{
    status: string;
    data: AttendanceRecord[];
  }>(`/attendance?month=${month}&year=${year}`);

  return response.data;
}

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