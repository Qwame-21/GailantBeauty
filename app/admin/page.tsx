import type { Metadata } from "next";
import { AdminDashboard } from "../AdminDashboard";
import "./admin.css";

export const metadata: Metadata = { title: "Admin | Gailant Beauty", robots: { index: false, follow: false } };

export default function AdminPage() { return <AdminDashboard />; }
