import { redirect } from "next/navigation";

// Courses live on the Prochess site. Keep old bookmarks working by redirecting.
export default function CoursesRedirect() {
  redirect("https://prochess-v2-ashen.vercel.app/courses");
}
