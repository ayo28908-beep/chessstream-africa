import type { Metadata } from "next";
import AdminPage from "./admin-page";

export const metadata: Metadata = {
  title: "Admin",
  description: "Tournament organizer panel for ChessStream Africa.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPage />;
}
