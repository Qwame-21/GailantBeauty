import type { Metadata } from "next";
import { GailandAdmin } from "../AdminDashboard";

export const metadata: Metadata = {
  title: "Staff Dashboard | Gailant Beauty",
  description: "Private staff access for Gailant Beauty.",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <GailandAdmin />;
}
