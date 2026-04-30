/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://reokiy.vercel.app',
  generateRobotsTxt: true, // ahora él lo generará
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/forreo'] // rutas que quieras bloquear
      }
    ],
    additionalSitemaps: [
      'https://reokiy.vercel.app/sitemap.xml',
    ],
  },
  // resto de opciones igual
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
}