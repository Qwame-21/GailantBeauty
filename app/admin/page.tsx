import type { Metadata } from "next";
import { GailandAdmin } from "../AdminDashboard";

export const metadata: Metadata = {
  title: "Staff Dashboard | Gailand Beauty",
  description: "Private staff access for Gailand Beauty.",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <GailandAdmin />;
}
