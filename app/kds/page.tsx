import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function KitchenDisplay() {
  try {
    const user = await requireRole(["ADMIN", "EMPLOYEE"]);
    return (
      <main className="p-6 bg-gray-900 text-white min-h-screen">
        <h1 className="text-3xl font-bold">🍳 Kitchen Display</h1>
        <p className="mt-2 text-gray-300">Welcome, {user.name}!</p>
        <p className="mt-4 text-yellow-400">
          ✅ Auth working! Next: Real-time order tickets
        </p>
      </main>
    );
  } catch {
    redirect("/login");
  }
}