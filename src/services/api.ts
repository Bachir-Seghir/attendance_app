const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

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

export interface Employee {
  id: number;
  name: string;
  departmentId: number;
  department: {
    id: number;
    name: string;
  };
}

export async function getEmployees(): Promise<Employee[]> {
  const response = await apiRequest<{
    status: string;
    data: Employee[];
  }>("/employees");

  return response.data;
}

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