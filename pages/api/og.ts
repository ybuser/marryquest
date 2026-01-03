import type { NextApiRequest, NextApiResponse } from 'next';

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const titleParam = Array.isArray(req.query.title) ? req.query.title[0] : req.query.title;
  const subtitleParam = Array.isArray(req.query.subtitle) ? req.query.subtitle[0] : req.query.subtitle;

  const title = escapeSvgText(titleParam || 'MarryQuest Invitation');
  const subtitle = escapeSvgText(subtitleParam || 'Your special day, beautifully shared');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Open Graph image">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f6f4ff" />
        <stop offset="100%" stop-color="#e5ddff" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7e5bef" />
        <stop offset="100%" stop-color="#c084fc" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" rx="32" />
    <rect x="60" y="70" width="1080" height="490" rx="28" fill="white" stroke="url(#accent)" stroke-width="3" />
    <circle cx="120" cy="110" r="6" fill="#7e5bef" />
    <circle cx="150" cy="110" r="6" fill="#c084fc" />
    <circle cx="180" cy="110" r="6" fill="#7e5bef" />
    <text x="100" y="210" font-family="'Inter', 'Pretendard', system-ui, -apple-system, sans-serif" font-size="64" font-weight="700" fill="#2e1a47">${title}</text>
    <text x="100" y="290" font-family="'Inter', 'Pretendard', system-ui, -apple-system, sans-serif" font-size="32" font-weight="400" fill="#4b3a63">${subtitle}</text>
    <rect x="100" y="340" width="1000" height="120" rx="18" fill="url(#accent)" opacity="0.12" />
    <text x="120" y="410" font-family="'Inter', 'Pretendard', system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#4b3a63">A premium invitation crafted with MarryQuest</text>
    <text x="120" y="460" font-family="'Inter', 'Pretendard', system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#6a587f">Share memories, locations, and thoughtful details effortlessly.</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(svg);
}
