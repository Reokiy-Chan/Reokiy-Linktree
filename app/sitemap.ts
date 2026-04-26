import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reokiy.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/aboutme`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ]
}
