// QR codes for the page, generated at build time for printing on cards, posters and menus.
import QRCode from 'qrcode';

const OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 2,
  color: { dark: '#1d1d1fff', light: '#ffffffff' },
} as const;

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...OPTIONS, type: 'svg' });
}

export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...OPTIONS, type: 'png', width: 1024 });
}
