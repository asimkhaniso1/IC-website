/** QR code helpers for the design specification PDF. */
import QRCode from 'qrcode';

/** Renders `text` as a QR code PNG data URL. */
export async function qrDataUrl(text: string, size = 256): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}
