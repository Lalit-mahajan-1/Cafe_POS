import { requireRole } from "@/lib/auth/session";
import EmployeeSidebar from "@/app/(employee)/components/EmployeeSidebar";
import BookSeatClient from "./BookSeatClient";

export default async function BookSeatPage() {
  const user = await requireRole(["ADMIN", "EMPLOYEE"]);

  return (
    <>
      <EmployeeSidebar userName={user.name} userEmail={user.email} userAvatar={user.avatar} />
      <main className="min-h-screen lg:ml-72 bg-[#F3EFE8] text-[#000505] p-6">
        <BookSeatClient user={user} isAdmin={user.role === "ADMIN"} />
      </main>
    </>
  );
}
