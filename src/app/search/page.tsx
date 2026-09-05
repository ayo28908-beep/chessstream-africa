import type { Metadata } from "next";
import SearchPage from "./search-page";

export const metadata: Metadata = {
  title: "Head-to-Head",
  description: "Compare any two chess players head to head. Search results, win/draw/loss records, and recent games between them.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Head-to-Head | ChessStream Africa",
    description: "Compare any two chess players head to head.",
  },
};

export default function Page() {
  return <SearchPage />;
}
