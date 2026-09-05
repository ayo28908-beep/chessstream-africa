import { redirect } from "next/navigation";

// Puzzles live on the Prochess site. Keep old bookmarks working by redirecting.
export default function PuzzlesRedirect() {
  redirect("https://prochess-v2-ashen.vercel.app/puzzles");
}
