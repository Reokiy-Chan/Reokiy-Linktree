import type { NextApiResponse } from 'next';

const Robots = (res: NextApiResponse) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /forreo
Sitemap: https://reokiy.vercel.app/sitemap.xml`);
  res.end();
};

export default Robots;