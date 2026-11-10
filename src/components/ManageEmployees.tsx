
import { useEffect, useState } from "react";
import {
    apiRequest,
    getEmployees,
    type Employee,
    type Department,
} from "../services/api";

interface ManageEmployeesProps {
    departments: Department[];
    onEmployeesChanged: () => Promise<void>;
}

export default function ManageEmployees({
    departments,
    onEmployeesChanged,
}: ManageEmployeesProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [departmentId, setDepartmentId] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadEmployees = async () => {
        setIsLoading(true);
        setError("");

        try {
            const data = await getEmployees(true);
            setEmployees(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load employees"
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadEmployees();
        }
    }, [isOpen]);

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setDepartmentId("");
        setError("");
    };

    const handleEdit = (employee: Employee) => {
        setEditingId(employee.id);
        setName(employee.name);
        setDepartmentId(String(employee.departmentId));
        setError("");
        setSuccess("");
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedName = name.trim();
        const parsedDepartmentId = Number(departmentId);

        if (!trimmedName || trimmedName.length > 100) {
            setError("Employee name must be between 1 and 100 characters.");
            return;
        }

        if (!Number.isInteger(parsedDepartmentId) || parsedDepartmentId <= 0) {
            setError("Please select a valid department.");
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            if (editingId !== null) {
                await apiRequest(`/employees/${editingId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        name: trimmedName,
                        departmentId: parsedDepartmentId,
                    }),
                });

                setSuccess("Employee updated successfully.");
            } else {
                await apiRequest("/employees", {
                    method: "POST",
                    body: JSON.stringify({
                        name: trimmedName,
                        departmentId: parsedDepartmentId,
                    }),
                });

                setSuccess("Employee added successfully.");
            }

            resetForm();
            await loadEmployees();
            await onEmployeesChanged();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save employee"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeactivate = async (employee: Employee) => {
        if (
            !window.confirm(
                `Deactivate ${employee.name}? Their attendance history will be preserved.`
            )
        ) {
            return;
        }

        setBusyId(employee.id);
        setError("");
        setSuccess("");

        try {
            await apiRequest(`/employees/${employee.id}`, {
                method: "DELETE",
            });

            setSuccess(`${employee.name} was deactivated.`);
            await loadEmployees();
            await onEmployeesChanged();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to deactivate employee"
            );
        } finally {
            setBusyId(null);
        }
    };

    const handleReactivate = async (employee: Employee) => {
        setBusyId(employee.id);
        setError("");
        setSuccess("");

        try {
            await apiRequest(`/employees/${employee.id}/restore`, {
                method: "PATCH",
            });

            setSuccess(`${employee.name} was reactivated.`);
            await loadEmployees();
            await onEmployeesChanged();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to reactivate employee"
            );
        } finally {
            setBusyId(null);
        }
    };

    const visibleEmployees = employees.filter((employee) =>
        showInactive ? !employee.isActive : employee.isActive
    );

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setSuccess("");
                    resetForm();
                }}
                className="rounded-lg  px-4 py-2 text-white bg-orange-500 hover:bg-orange-600 hover:cursor-pointer"
            >
                Manage Employees
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Employee Management
                            </h2>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-2xl text-gray-500 hover:text-gray-800"
                            >
                                &times;
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700">
                                {success}
                            </div>
                        )}

                        <form
                            onSubmit={handleSave}
                            className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
                        >
                            <h3 className="mb-4 font-semibold text-gray-700">
                                {editingId !== null ? "Edit Employee" : "Add Employee"}
                            </h3>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-600">
                                        Employee Name
                                    </label>

                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        maxLength={100}
                                        placeholder="Enter employee name"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-600">
                                        Department
                                    </label>

                                    <select
                                        value={departmentId}
                                        onChange={(event) =>
                                            setDepartmentId(event.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
                                        required
                                    >
                                        <option value="">Select department</option>

                                        {departments.map((department) => (
                                            <option
                                                key={department.id}
                                                value={department.id}
                                            >
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                    {isLoading
                                        ? "Saving..."
                                        : editingId !== null
                                          ? "Update Employee"
                                          : "Add Employee"}
                                </button>

                                {editingId !== null && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-semibold text-gray-700">
                                {showInactive ? "Inactive Employees" : "Active Employees"}
                            </h3>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowInactive((current) => !current);
                                    resetForm();
                                    setError("");
                                    setSuccess("");
                                }}
                                className="text-sm font-medium text-emerald-700 hover:underline"
                            >
                                {showInactive
                                    ? "View Active Employees"
                                    : "View Inactive Employees"}
                            </button>
                        </div>

                        {isLoading && employees.length === 0 ? (
                            <p className="py-6 text-center text-gray-500">
                                Loading employees...
                            </p>
                        ) : visibleEmployees.length === 0 ? (
                            <p className="py-6 text-center text-gray-500">
                                No employees found.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-150 border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-100 text-left text-gray-600">
                                            <th className="p-3">Employee</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {visibleEmployees.map((employee) => (
                                            <tr
                                                key={employee.id}
                                                className="border-b border-gray-100"
                                            >
                                                <td className="p-3 font-medium text-gray-800">
                                                    {employee.name}
                                                </td>

                                                <td className="p-3 text-gray-600">
                                                    {employee.department?.name ?? "—"}
                                                </td>

                                                <td className="p-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {!showInactive && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEdit(employee)}
                                                                    className="rounded-md bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={busyId === employee.id}
                                                                    onClick={() => handleDeactivate(employee)}
                                                                    className="rounded-md bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                                >
                                                                    Deactivate
                                                                </button>
                                                            </>
                                                        )}

                                                        {showInactive && (
                                                            <button
                                                                type="button"
                                                                disabled={busyId === employee.id}
                                                                onClick={() => handleReactivate(employee)}
                                                                className="rounded-md bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                                            >
                                                                Reactivate
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
