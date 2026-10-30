// CSV for workspace users: the export's columns are a superset of what the import reads (name, email, job title).
import { parseCsv, toCsv } from "@/lib/csv";
import type { ImportRow, ManagedUser } from "../services/userService";

const HEADERS: Record<keyof ImportRow, string[]> = {
  name: ["name", "full name", "fullname", "employee name"],
  email: ["email", "e-mail", "email address", "work email"],
  jobTitle: ["job title", "jobtitle", "title", "designation", "role title"],
};

export const IMPORT_TEMPLATE = toCsv([
  ["name", "email", "job title"],
  ["Asha Rao", "asha@example.com", "Store Manager"],
]);

/**
 * People from CSV text. With a header row, columns are found by name (name, email, job title, in any order);
 * without one, the columns are taken as name, email, job title.
 */
export function importRowsFromCsv(text: string): ImportRow[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map(cell => cell.toLowerCase());
  const hasHeader = header.some(cell => HEADERS.email.includes(cell));
  const column = (key: keyof ImportRow, fallback: number) => (hasHeader ? header.findIndex(cell => HEADERS[key].includes(cell)) : fallback);
  const at = { name: column("name", 0), email: column("email", 1), jobTitle: column("jobTitle", 2) };
  return (hasHeader ? rows.slice(1) : rows).map(row => ({
    name: at.name >= 0 ? (row[at.name] ?? "") : "",
    email: at.email >= 0 ? (row[at.email] ?? "").toLowerCase() : "",
    jobTitle: at.jobTitle >= 0 ? row[at.jobTitle] || null : null,
  }));
}

export const usersToCsv = (users: ManagedUser[]) =>
  toCsv([
    ["name", "email", "login key code", "job title", "roles", "status", "last sign-in", "joined on", "created"],
    ...users.map(user => [
      user.name,
      user.email,
      user.loginCode ?? "",
      user.jobTitle,
      user.roles.map(role => role.name).join("; "),
      user.isActive ? (user.mustChangePassword ? "temporary password" : "active") : "deactivated",
      user.lastLoginAt ?? "",
      user.joinedOn ?? "",
      user.createdAt,
    ]),
  ]);
