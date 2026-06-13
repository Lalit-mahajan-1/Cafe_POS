import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function PosTerminal() {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold">🍽️ POS Terminal</h1>
        <p className="mt-2 text-gray-600">Welcome, {user.name}!</p>
        <p className="mt-1 text-sm text-gray-500">Role: {user.role}</p>
        <p className="mt-4 text-blue-600">
          ✅ Auth working! Next: Build floor popup → order view
        </p>
      </main>
    );
  } catch {
    redirect("/login");
  }
}