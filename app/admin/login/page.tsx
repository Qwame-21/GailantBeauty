import type { Metadata } from "next";
import { AdminLogin } from "../../AdminLogin";
import "../admin.css";

export const metadata: Metadata = { title: "Admin Login | Gailant Beauty", robots: { index: false, follow: false } };

export default function AdminLoginPage() { return <AdminLogin />; }
