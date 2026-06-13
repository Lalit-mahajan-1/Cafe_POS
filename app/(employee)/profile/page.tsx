import EmployeeSidebar from "@/app/(employee)/components/EmployeeSidebar";
import ProfileClient from "@/components/profile/ProfileClient";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function EmployeeProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/admin/profile");
  }

  return (
    <main className="min-h-screen bg-[#F3EFE8]">
      <EmployeeSidebar
        userName={user.name}
        userEmail={user.email}
        userAvatar={user.avatar}
      />
      <section className="lg:ml-72">
        <div className="mx-auto max-w-7xl p-6">
          <ProfileClient user={user} />
        </div>
      </section>
    </main>
  );
}
