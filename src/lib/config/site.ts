import type { SiteConfig } from '$lib/types/site'

export const site: SiteConfig = {
  protocol: import.meta.env.URARA_SITE_PROTOCOL ?? import.meta.env.DEV ? 'http://' : 'https://',
  domain: import.meta.env.URARA_SITE_DOMAIN ?? 'robertmaye.co.uk',
  title: 'Silicon Sentience',
  subtitle: 'The Emergence of Synthetic Intelligence',
  lang: 'en-US',
  description: 'Exploring the fusion of organic thought and machine precision. Dive into the rise and evolution of synthetic intelligence.',
  author: {
    avatar: '/assets/aiman.png',
    name: 'Robert Maye',
    status: '💫',
    bio: 'Navigating the frontier where the organic meets the algorithmic. Here, I delve into the depths of synthetic intelligence, sharing discoveries and reflections.',
    linktree: 'https://linktr.ee/robmaye',
  },
  themeColor: '#2D3748'
}
