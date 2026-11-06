
export const ATTENDANCE_CODES = {
  R: "Repos",
  F: "Férié",
  CR: "Congé récupération",
  CA: "Congé annuel",
  CF: "Congé familial",
  FO: "Formation",
  AA: "Absence autorisée",
  AI: "Absence non autorisée",
} as const;

// Check whether a value is a valid completed entry
export function isValidAttendanceValue(value: string): boolean {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === "") return true;

  // Accept numbers between 0 and 24, including decimals
  if (/^\d+(\.\d+)?$/.test(normalizedValue)) {
    const hours = Number(normalizedValue);
    return hours >= 0 && hours <= 24;
  }

  // Accept only predefined attendance codes
  return Object.prototype.hasOwnProperty.call(
    ATTENDANCE_CODES,
    normalizedValue
  );
}

// Allow incomplete codes while the user is typing
export function validateAttendanceInput(
  value: string
): string | null {
  const normalizedValue = value.trim().toUpperCase();

  if (isValidAttendanceValue(normalizedValue)) {
    return normalizedValue;
  }

  // Allow temporary prefixes such as C or A while typing CR or AA
  const partialCodes = ["C", "A"];

  if (partialCodes.includes(normalizedValue)) {
    return normalizedValue;
  }

  // Allow an unfinished decimal such as 8.
  if (/^\d+\.?$/.test(normalizedValue)) {
    const hours = Number(normalizedValue);

    if (hours <= 24) return normalizedValue;
  }

  return null;
}
