const bundledClientLogos = {
  'aki no sora': '/logos/aki-no-sora.jpg',
  'akin osora': '/logos/aki-no-sora.jpg',
  'harunokaze': '/logos/harunokaze.jpg',
  'haru no kaze': '/logos/harunokaze.jpg',
};

export const ILUSA_LOGO_PATH = '/logos/ilusa.jpg';

export function getClientLogo(client) {
  if (client?.logo_url) return client.logo_url;
  const name = String(client?.company_name || '').trim().toLowerCase();
  return bundledClientLogos[name] || '';
}
