import { requireRole } from "@/lib/auth/session";
import BookSeatClient from "@/app/(employee)/book-seat/BookSeatClient";

export default async function AdminTablesPage() {
  const user = await requireRole(["ADMIN"]);

  return <BookSeatClient user={user} isAdmin={true} />;
}