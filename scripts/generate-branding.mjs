import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const brandingDir = path.join(root, 'public', 'branding');
const iconsDir = path.join(root, 'src', 'assets', 'icons');

const colors = {
  gold: '#D4AF37',
  black: '#0F1115',
  white: '#F8F9FA',
};

const svgHeader = (viewBox = '0 0 24 24') =>
  `xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;

const logoSvg = ({ background = 'transparent', primary = colors.gold, secondary = colors.white, includeWordmark = true } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<svg ${svgHeader('0 0 1024 1024')} role="img" aria-labelledby="title desc">
  <title id="title">BarberFlow monogram</title>
  <desc id="desc">Premium B monogram with barber pole, scissors and straight razor.</desc>
  ${background !== 'transparent' ? `<rect width="1024" height="1024" rx="224" fill="${background}"/>` : ''}
  <g transform="translate(112 92)">
    <path d="M279 91v744" stroke="${primary}" stroke-width="64"/>
    <path d="M292 112h210c151 0 255 76 255 199 0 78-42 139-113 172 94 30 153 99 153 196 0 137-111 226-277 226H292"
      stroke="${primary}" stroke-width="72"/>
    <path d="M312 160h177c94 0 157 50 157 132 0 84-63 135-158 135H312" stroke="${secondary}" stroke-width="22"/>
    <path d="M312 505h206c104 0 171 58 171 151 0 94-67 153-174 153H312" stroke="${secondary}" stroke-width="22"/>
    <g stroke="${primary}" stroke-width="28">
      <path d="M360 207v227"/>
      <path d="M360 234l86 48"/>
      <path d="M360 306l86 48"/>
      <path d="M360 378l70 39"/>
    </g>
    <g stroke="${secondary}" stroke-width="24">
      <circle cx="424" cy="625" r="42"/>
      <circle cx="544" cy="625" r="42"/>
      <path d="M454 654l-102 109"/>
      <path d="M514 654l112 119"/>
      <path d="M470 610l46 31"/>
    </g>
    <g stroke="${primary}" stroke-width="26">
      <path d="M427 735h183"/>
      <path d="M610 735l72 46"/>
      <path d="M610 735l72-46"/>
      <path d="M427 735l-46-30"/>
    </g>
    <path d="M172 132v725" stroke="${primary}" stroke-width="18" opacity=".55"/>
    <path d="M158 132h220" stroke="${primary}" stroke-width="18" opacity=".55"/>
    <path d="M158 857h374" stroke="${primary}" stroke-width="18" opacity=".55"/>
  </g>
  ${includeWordmark ? `
  <g fill="${secondary}" text-anchor="middle">
    <text x="512" y="946" font-family="Georgia, serif" font-size="58" font-weight="700" letter-spacing="13">BARBERFLOW</text>
    <text x="512" y="988" font-family="Arial, sans-serif" font-size="22" letter-spacing="10" opacity=".62">PREMIUM BARBERSHOP SAAS</text>
  </g>` : ''}
</svg>
`;

const faviconSvg = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg ${svgHeader('0 0 64 64')} role="img" aria-label="BarberFlow favicon">
  <rect width="64" height="64" rx="16" fill="${colors.black}"/>
  <path d="M22 12v40M22 13h14c9 0 15 5 15 12 0 5-3 9-8 11 6 2 10 7 10 14 0 8-7 14-17 14H22" stroke="${colors.gold}" stroke-width="5.6"/>
  <path d="M25 18h11c5 0 8 3 8 7s-3 7-8 7H25M25 38h13c5 0 8 3 8 7s-3 7-8 7H25" stroke="${colors.white}" stroke-width="1.8"/>
  <path d="M28 19v15M28 22l6 3M28 27l6 3" stroke="${colors.gold}" stroke-width="1.8"/>
</svg>
`;

const icon = (body, viewBox = '0 0 24 24') => `<?xml version="1.0" encoding="UTF-8"?>
<svg ${svgHeader(viewBox)} width="24" height="24" stroke="${colors.gold}" stroke-width="2" role="img">
  <g stroke="${colors.gold}">${body}</g>
</svg>
`;

const icons = {
  'dashboard.svg': icon('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17h7M17.5 13.5v7"/>'),
  'calendar.svg': icon('<path d="M8 2v4M16 2v4"/><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>'),
  'clients.svg': icon('<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  'appointments.svg': icon('<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 11h16"/><path d="M8 16l2.5 2.5L16 13"/>'),
  'services.svg': icon('<circle cx="7" cy="6" r="2.5"/><circle cx="7" cy="18" r="2.5"/><path d="M9 8l10 10M9 16L19 6"/>'),
  'products.svg': icon('<path d="M6 8.5 12 5l6 3.5v7L12 19l-6-3.5z"/><path d="M6 8.5 12 12l6-3.5M12 12v7"/><path d="M9 6.8 15 10.3"/>'),
  'pos.svg': icon('<rect x="3" y="4" width="18" height="14" rx="3"/><path d="M7 8h6M7 12h4M16 12h1M15 16h2M8 21h8"/>'),
  'sales.svg': icon('<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/><path d="M4 21h16"/>'),
  'reports.svg': icon('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5"/><path d="M8 17v-5M12 17V9M16 17v-3"/>'),
  'barbers.svg': icon('<path d="M7 3h10v18H7z"/><path d="M10 3v18M14 3v18"/><path d="M7 8h10M7 16h10"/><path d="M10 5l4 3M10 9l4 3M10 13l4 3"/>'),
  'loyalty.svg': icon('<path d="M12 21s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11z"/><path d="M9.5 11.5h5M12 9v5"/>'),
  'membership.svg': icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h5M7 14h3"/><circle cx="16.5" cy="12" r="2.5"/><path d="M15 16.5h3"/>'),
  'settings.svg': icon('<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05a2.1 2.1 0 0 1-3 3l-.05-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1 1.64V21a2.1 2.1 0 0 1-4.2 0v-.08a1.8 1.8 0 0 0-1-1.64 1.8 1.8 0 0 0-2 .36l-.05.05a2.1 2.1 0 0 1-3-3l.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.64-1H3a2.1 2.1 0 0 1 0-4.2h.08a1.8 1.8 0 0 0 1.64-1 1.8 1.8 0 0 0-.36-2l-.05-.05a2.1 2.1 0 0 1 3-3l.05.05a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1-1.64V3a2.1 2.1 0 0 1 4.2 0v.08a1.8 1.8 0 0 0 1 1.64 1.8 1.8 0 0 0 2-.36l.05-.05a2.1 2.1 0 0 1 3 3l-.05.05a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.64 1H21a2.1 2.1 0 0 1 0 4.2h-.08a1.8 1.8 0 0 0-1.52.44z"/>'),
  'notifications.svg': icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/><circle cx="18.5" cy="5.5" r="2.5" fill="#D4AF37" stroke="none"/>'),
  'whatsapp.svg': icon('<path d="M4.5 19.5 6 15.8A8 8 0 1 1 9 18.7z"/><path d="M9.5 8.5c.4 3.1 2.9 5.5 6 6l1.1-1.5c.2-.3.1-.7-.2-.9l-1.8-1c-.3-.2-.7-.1-.9.2l-.5.7a5.7 5.7 0 0 1-2.7-2.7l.7-.5c.3-.2.4-.6.2-.9l-1-1.8c-.2-.3-.6-.4-.9-.2z"/>'),
  'analytics.svg': icon('<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/><path d="M7 6l3 2 3-4 4 3"/>'),
  'inventory.svg': icon('<path d="M4 7h16M6 7v13h12V7"/><path d="M9 7V4h6v3"/><path d="M9 12h6M9 16h4"/>'),
  'payments.svg': icon('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M7 15h4"/><path d="M16 15h1"/>'),
  'users.svg': icon('<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M17 3.13a4 4 0 0 1 0 7.75"/>'),
};

const pngToIco = (pngBuffers) => {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = pngBuffers.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngBuffers.map((item) => item.buffer)]);
};

await fs.mkdir(brandingDir, { recursive: true });
await fs.mkdir(iconsDir, { recursive: true });

await fs.writeFile(path.join(brandingDir, 'logo.svg'), logoSvg({ background: 'transparent', primary: colors.gold, secondary: colors.white }));
await fs.writeFile(path.join(brandingDir, 'logo-dark.svg'), logoSvg({ background: colors.black, primary: colors.gold, secondary: colors.white }));
await fs.writeFile(path.join(brandingDir, 'logo-light.svg'), logoSvg({ background: 'transparent', primary: colors.black, secondary: colors.gold }));
await fs.writeFile(path.join(brandingDir, 'favicon.svg'), faviconSvg());
await fs.writeFile(path.join(root, 'public', 'favicon.svg'), faviconSvg());

for (const [fileName, content] of Object.entries(icons)) {
  await fs.writeFile(path.join(iconsDir, fileName), content);
}

const faviconSource = Buffer.from(faviconSvg());
const icoPngs = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    buffer: await sharp(faviconSource).resize(size, size).png().toBuffer(),
  })),
);
await fs.writeFile(path.join(brandingDir, 'favicon.ico'), pngToIco(icoPngs));
await fs.writeFile(path.join(root, 'public', 'favicon.ico'), pngToIco(icoPngs));

await sharp(faviconSource).resize(180, 180).png().toFile(path.join(brandingDir, 'apple-touch-icon.png'));
await sharp(faviconSource).resize(180, 180).png().toFile(path.join(root, 'public', 'apple-touch-icon.png'));

for (const size of [16, 32, 48, 180, 512]) {
  await sharp(faviconSource).resize(size, size).png().toFile(path.join(brandingDir, `favicon-${size}x${size}.png`));
}

console.log(`Branding generated in ${brandingDir}`);
console.log(`Icon library generated in ${iconsDir}`);
