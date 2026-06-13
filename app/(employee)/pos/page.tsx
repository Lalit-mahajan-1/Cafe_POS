import POSClient from "@/app/(employee)/components/pos/POSClient";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getPosUser() {
  try {
    return await requireRole(["ADMIN", "EMPLOYEE"]);
  } catch {
    redirect("/login");
  }
}

export default async function PosTerminal() {
  const user = await getPosUser();

  return (
    <POSClient
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }}
    />
  );
}
