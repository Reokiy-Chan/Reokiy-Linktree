/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://reokiy.vercel.app', // <-- PON AQUÍ TU DOMINIO DE VERCEL
  generateRobotsTxt: false, // Ya creaste tu robots.txt a mano, lo mantienes
  // Opcional: puedes generar robots.txt automáticamente poniéndolo en true,
  // pero como ya lo tienes, lo dejamos en false para que no se sobreescriba.
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
}