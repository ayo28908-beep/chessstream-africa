import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://chessstream-africa.vercel.app";

  const routes = [
    { path: "", priority: 1 },
    { path: "/broadcasts", priority: 0.9 },
    { path: "/analyze", priority: 0.8 },
    { path: "/search", priority: 0.8 },
    { path: "/setup", priority: 0.8 },
    { path: "/players", priority: 0.8 },
    { path: "/schools", priority: 0.7 },
    { path: "/about", priority: 0.7 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route.priority,
  }));
}
