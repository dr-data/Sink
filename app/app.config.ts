export default defineAppConfig({
  title: 'shor.lol',
  github: 'https://github.com/dr-data/Sink',
  twitter: 'https://shor.lol',
  telegram: 'https://shor.lol',
  description: 'shor.lol — A Simple / Speedy / Secure Link Shortener with Analytics, 100% run on Cloudflare.',
  image: 'https://sink.cool/banner.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
