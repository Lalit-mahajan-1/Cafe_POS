import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="max-w-2xl mx-auto mt-20 p-6">
      <h1 className="text-3xl font-bold">Welcome, {user.name} 👋</h1>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
      <LogoutButton />
    </main>
  );
}