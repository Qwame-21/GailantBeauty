import type { Metadata } from "next";
import { AdminPage } from "../GailandApp";

export const metadata: Metadata = {
  title: "Staff Dashboard | Gailand Beauty",
  description: "Private staff access for Gailand Beauty.",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <AdminPage />;
}
