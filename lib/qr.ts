import QRCode from "qrcode";

export async function qrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 640,
    errorCorrectionLevel: "M",
    color: { dark: "#2a1040", light: "#ffffff" },
  });
}
