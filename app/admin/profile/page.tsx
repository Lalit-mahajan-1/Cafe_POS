

import ProfileClient from "@/components/profile/ProfileClient";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }


  if (user.role !== "ADMIN") {
    redirect("/profile");
  }

  return <ProfileClient user={user} />;
}
