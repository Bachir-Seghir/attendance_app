
import { useState } from "react";
import { apiRequest } from "../services/api";

interface AddDepartmentProps {
    onDepartmentAdded: () => void | Promise<void>;
}

export default function AddDepartment({
    onDepartmentAdded,
}: AddDepartmentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleClose = () => {
        if (isSaving) return;

        setIsOpen(false);
        setName("");
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const departmentName = name.trim();

        if (!departmentName) {
            setError("Please enter a department name.");
            return;
        }

        setIsSaving(true);
        setError("");
        setSuccess("");

        try {
            await apiRequest("/departments", {
                method: "POST",
                body: JSON.stringify({ name: departmentName }),
            });

            await onDepartmentAdded();

            setName("");
            setSuccess("Department created successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create department."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex">
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setError("");
                    setSuccess("");
                }}
                className="ml-auto px-4 py-2 bg-emerald-700 hover:cursor-pointer hover:bg-emerald-900 text-white rounded-lg transition-colors"
            >
                + Ajouter une Structure
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) handleClose();
                    }}
                >
                    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Ajouter une Structure
                            </h2>

                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSaving}
                                className="text-gray-400 hover:text-gray-700 text-2xl disabled:opacity-50"
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label
                                    htmlFor="departmentName"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Nom de la Structure
                                </label>

                                <input
                                    id="departmentName"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Maintenance"
                                    maxLength={100}
                                    autoFocus
                                    disabled={isSaving}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600">{error}</p>
                            )}

                            {success && (
                                <p className="text-sm text-green-600">{success}</p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSaving || !name.trim()}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? "Sauvgarde..." : "Ajouter"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
