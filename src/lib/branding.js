const bundledClientLogos = {
  'aki no sora': '/logos/aki-no-sora.jpg',
  'akin osora': '/logos/aki-no-sora.jpg',
  'harunokaze': '/logos/harunokaze.jpg',
  'haru no kaze': '/logos/harunokaze.jpg',
};

export const ILUSA_LOGO_PATH = '/logos/ilusa.jpg';

export function getClientLogo(client) {
  const name = String(client?.company_name || '').trim().toLowerCase();
  return bundledClientLogos[name] || client?.logo_url || '';
}
