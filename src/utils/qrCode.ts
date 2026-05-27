import QRCode from 'qrcode'

const QR_CODE_SHARED = {
  width: 200,
  margin: 1,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#000000' },
}

export async function generateQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...QR_CODE_SHARED, type: 'svg' })
}

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    ...QR_CODE_SHARED,
    color: { ...QR_CODE_SHARED.color, light: '#ffffff' },
  })
}
