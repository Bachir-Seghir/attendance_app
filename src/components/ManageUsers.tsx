
import { useEffect, useState, type FormEvent } from "react";
import {
    getUsers,
    createUser,
    updateUser,
    changeUserStatus,
    resetUserPassword,
    type ManagedUser,
    type UserRole,
    type Department,
} from "../services/api";

interface ManageUsersProps {
    departments: Department[];
}

const roleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin",
    MANAGER: "Manager",
    ATTENDANCE_OFFICER: "Attendance Officer",
    VISITOR: "Visitor",
};

export default function ManageUsers({ departments }: ManageUsersProps) {
    const [users, setUsers] = useState<ManagedUser[]>([]);

    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [showInactive, setShowInactive] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("VISITOR");
    const [departmentId, setDepartmentId] = useState("");

    const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadUsers() {
        setIsLoading(true);
        setError("");

        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load users.");
        } finally {
            setIsLoading(false);
        }
    }

    // Load all existing users whenever the management modal opens.
    useEffect(() => {
        if (isManagementOpen) {
            loadUsers();
        }
    }, [isManagementOpen]);

    function openManagement() {
        setError("");
        setSuccess("");
        setIsManagementOpen(true);
    }

    function resetForm() {
        setEditingId(null);
        setName("");
        setEmail("");
        setPassword("");
        setRole("VISITOR");
        setDepartmentId("");
        setError("");
    }

    function openCreateForm() {
        resetForm();
        setIsFormOpen(true);
    }

    function openEditForm(user: ManagedUser) {
        resetForm();
        setEditingId(user.id);
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setDepartmentId(user.departmentId?.toString() ?? "");
        setIsFormOpen(true);
    }

    async function handleSave(event: FormEvent) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (role === "ATTENDANCE_OFFICER" && !departmentId) {
            setError("Please assign a department to this attendance officer.");
            return;
        }

        setIsSaving(true);

        try {
            const data = {
                name: name.trim(),
                email: email.trim(),
                role,
                departmentId:
                    role === "ATTENDANCE_OFFICER"
                        ? Number(departmentId)
                        : null,
            };

            if (editingId !== null) {
                await updateUser(editingId, data);
                setSuccess("User updated successfully.");
            } else {
                await createUser({
                    ...data,
                    password,
                });
                setSuccess("User created successfully.");
            }

            setIsFormOpen(false);
            resetForm();
            await loadUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save user.");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleStatusChange(user: ManagedUser) {
        const action = user.isActive ? "deactivate" : "activate";

        if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await changeUserStatus(user.id, !user.isActive);
            setSuccess(`User ${action}d successfully.`);
            await loadUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update user.");
        }
    }

    async function handlePasswordReset(event: FormEvent) {
        event.preventDefault();

        if (newPassword.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (passwordUserId === null) return;

        setIsSaving(true);
        setError("");
        setSuccess("");

        try {
            await resetUserPassword(passwordUserId, newPassword);
            setSuccess("Password reset successfully.");
            setPasswordUserId(null);
            setNewPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to reset password.");
        } finally {
            setIsSaving(false);
        }
    }

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());

        return matchesSearch && (showInactive || user.isActive);
    });

    return (
        <>
            {/* Main button */}
            <button
                onClick={openManagement}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
                Manage Users
            </button>

            {/* Main management modal */}
            {isManagementOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
                    <section className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-5 space-y-4">

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    User Management
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Manage application accounts and permissions.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openCreateForm}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    + Add User
                                </button>

                                <button
                                    onClick={() => setIsManagementOpen(false)}
                                    className="text-gray-500 hover:text-gray-800 text-2xl px-2"
                                    title="Close"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                                {success}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <input
                                type="text"
                                placeholder="Search name or email..."
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={showInactive}
                                    onChange={(event) => setShowInactive(event.target.checked)}
                                />
                                Show inactive users
                            </label>
                        </div>

                        {isLoading ? (
                            <p className="text-center py-8 text-gray-500">
                                Loading users...
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-gray-600">
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Email</th>
                                            <th className="p-3">Role</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="border-t border-gray-100">
                                                <td className="p-3 font-medium text-gray-800">
                                                    {user.name}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {user.email}
                                                </td>
                                                <td className="p-3">
                                                    {roleLabels[user.role]}
                                                </td>
                                                <td className="p-3 text-gray-600">
                                                    {user.department?.name ?? "—"}
                                                </td>
                                                <td className="p-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${
                                                            user.isActive
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-200 text-gray-600"
                                                        }`}
                                                    >
                                                        {user.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditForm(user)}
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setError("");
                                                                setPasswordUserId(user.id);
                                                                setNewPassword("");
                                                            }}
                                                            className="text-indigo-600 hover:underline"
                                                        >
                                                            Password
                                                        </button>

                                                        <button
                                                            onClick={() => handleStatusChange(user)}
                                                            className={`${
                                                                user.isActive
                                                                    ? "text-red-600"
                                                                    : "text-green-600"
                                                            } hover:underline`}
                                                        >
                                                            {user.isActive ? "Deactivate" : "Activate"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center p-8 text-gray-500">
                                                    {users.length === 0
                                                        ? "No users have been created yet."
                                                        : "No users found."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Add / Edit user modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleSave}
                        className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 space-y-4"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">
                                {editingId !== null ? "Edit User" : "Add User"}
                            </h3>

                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-500 text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Full name</label>
                            <input
                                required
                                maxLength={100}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Email</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>

                        {editingId === null && (
                            <div>
                                <label className="block text-sm mb-1">
                                    Initial password
                                </label>
                                <input
                                    required
                                    type="password"
                                    minLength={8}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full border rounded-lg p-2"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm mb-1">Role</label>
                            <select
                                value={role}
                                onChange={(event) => setRole(event.target.value as UserRole)}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="VISITOR">Visitor</option>
                                <option value="ATTENDANCE_OFFICER">Attendance Officer</option>
                                <option value="MANAGER">Manager</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>

                        {role === "ATTENDANCE_OFFICER" && (
                            <div>
                                <label className="block text-sm mb-1">Department</label>
                                <select
                                    required
                                    value={departmentId}
                                    onChange={(event) => setDepartmentId(event.target.value)}
                                    className="w-full border rounded-lg p-2"
                                >
                                    <option value="">Select department</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save User"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Reset password modal */}
            {passwordUserId !== null && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handlePasswordReset}
                        className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 space-y-4"
                    >
                        <h3 className="text-lg font-semibold">Reset Password</h3>

                        <input
                            type="password"
                            required
                            minLength={8}
                            placeholder="New password (at least 8 characters)"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                            className="w-full border rounded-lg p-2"
                        />

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPasswordUserId(null)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                                {isSaving ? "Resetting..." : "Reset Password"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
