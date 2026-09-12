import app from '../server';

export default function handler(req: any, res: any) {
  // If Vercel's rewrite mechanism set the internal route, restore the matched client path
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'];
  if (matchedPath && typeof matchedPath === 'string' && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  }
  return app(req, res);
}

export { app };

