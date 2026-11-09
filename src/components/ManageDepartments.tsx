
import { useState } from "react";
import { apiRequest, type Department } from "../services/api";

interface ManageDepartmentsProps {
    departments: Department[];
    onDepartmentsChanged: () => Promise<void>;
}

export default function ManageDepartments({
    departments,
    onDepartmentsChanged,
}: ManageDepartmentsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const startEditing = (department: Department) => {
        setEditingId(department.id);
        setEditingName(department.name);
        setError("");
        setSuccess("");
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName("");
        setError("");
    };

    const handleUpdate = async (id: number) => {
        const name = editingName.trim();

        if (!name) {
            setError("Department name is required.");
            return;
        }

        setBusyId(id);
        setError("");
        setSuccess("");

        try {
            await apiRequest(`/departments/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ name }),
            });

            await onDepartmentsChanged();

            setEditingId(null);
            setEditingName("");
            setSuccess("Department updated successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update department."
            );
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (department: Department) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${department.name}"?`
        );

        if (!confirmed) return;

        setBusyId(department.id);
        setError("");
        setSuccess("");

        try {
            await apiRequest(`/departments/${department.id}`, {
                method: "DELETE",
            });

            await onDepartmentsChanged();

            if (editingId === department.id) {
                cancelEditing();
            }

            setSuccess("Department deleted successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to delete department."
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setError("");
                    setSuccess("");
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700  font-semibold hover:bg-slate-200 hover:cursor-pointer"
            >
                Gérer Les Structures
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && busyId === null) {
                            setIsOpen(false);
                            cancelEditing();
                        }
                    }}
                >
                    <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Gérer Les Structures
                            </h2>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    cancelEditing();
                                }}
                                disabled={busyId !== null}
                                className="text-2xl text-gray-400 hover:text-gray-700 disabled:opacity-50"
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            {error && (
                                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </p>
                            )}

                            {success && (
                                <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                                    {success}
                                </p>
                            )}

                            {departments.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No departments found.
                                </p>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {departments.map((department) => (
                                        <div
                                            key={department.id}
                                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                                        >
                                            {editingId === department.id ? (
                                                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(event) =>
                                                            setEditingName(event.target.value)
                                                        }
                                                        maxLength={100}
                                                        disabled={busyId !== null}
                                                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                                                        autoFocus
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleUpdate(department.id)
                                                        }
                                                        disabled={
                                                            busyId !== null ||
                                                            !editingName.trim()
                                                        }
                                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                                                    >
                                                        {busyId === department.id
                                                            ? "Saving..."
                                                            : "Save"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        disabled={busyId !== null}
                                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="font-medium text-gray-800">
                                                        {department.name}
                                                    </span>

                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEditing(department)
                                                            }
                                                            disabled={busyId !== null}
                                                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDelete(department)
                                                            }
                                                            disabled={busyId !== null}
                                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            {busyId === department.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
