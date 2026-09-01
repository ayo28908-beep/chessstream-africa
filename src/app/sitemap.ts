import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://chessstream-africa.vercel.app";

  const routes = [
    "",
    "/broadcasts",
    "/analyze",
    "/puzzles",
    "/courses",
    "/players",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}
