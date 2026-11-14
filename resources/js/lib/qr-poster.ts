import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Same deep green and lime as the app.
const GREEN: RGB = [20, 83, 45];
const LIME: RGB = [163, 230, 53];
const INK: RGB = [20, 40, 27];
const MUTED: RGB = [91, 107, 95];

type PosterMachine = { name: string; location: string; qr_url: string };
type RGB = [number, number, number];

// The link a machine's QR code opens: a page to record prints on that machine without signing in.
// It holds the machine's secret QR token (from the server); base swaps the site address, e.g. for the live one.
export const machineUrl = (machine: PosterMachine, base?: string) => {
  if (!base) return machine.qr_url;
  const u = new URL(machine.qr_url);
  return `${base.replace(/\/$/, '')}${u.pathname}`;
};

const STEPS = [
  ['Scan', 'Point your phone camera at the QR code.'],
  ['Your name', 'Type your name (your phone remembers it).'],
  ['Pages', 'Type how many B&W and colour pages you printed.'],
  ['Save', 'Tap "Save record". Thank you!'],
];

// Shrinks the font until text fits the width, so long machine names still sit on one line.
function fitText(doc: jsPDF, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > maxWidth) doc.setFontSize(--size);
  return size;
}

async function drawPoster(doc: jsPDF, machine: PosterMachine, base?: string) {
  const W = doc.internal.pageSize.getWidth(); // 210
  const H = doc.internal.pageSize.getHeight(); // 297
  const cx = W / 2;
  const url = machineUrl(machine, base);

  // ---- Header band ----
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 52, 'F');
  doc.setFillColor(...LIME);
  doc.rect(0, 52, W, 2.5, 'F');
  doc.setTextColor(...LIME);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PHOTOSTAT USAGE LOG', cx, 18, { align: 'center', charSpace: 1.2 });
  doc.setTextColor(255);
  doc.setFontSize(fitText(doc, 'Scan to record your prints', W - 30, 30, 18));
  doc.text('Scan to record your prints', cx, 36, { align: 'center' });

  // ---- Machine name ----
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  fitText(doc, machine.name, W - 30, 30, 14);
  doc.text(machine.name, cx, 72, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...MUTED);
  if (machine.location) doc.text(machine.location, cx, 81, { align: 'center' });

  // ---- QR code ----
  const size = 110;
  const top = 97;
  const png = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 1200,
    color: { dark: '#14281b', light: '#ffffff' },
  });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.2);
  doc.roundedRect(cx - size / 2 - 7, top - 7, size + 14, size + 14, 6, 6, 'S');
  doc.addImage(png, 'PNG', cx - size / 2, top, size, size);

  // Link under the code, for anyone whose camera won't scan.
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  fitText(doc, url, W - 30, 9, 6);
  doc.text(url, cx, top + size + 14, { align: 'center' });

  // ---- Steps ----
  const stepsTop = 240;
  const colW = (W - 30) / STEPS.length;
  STEPS.forEach(([title, body], i) => {
    const x = 15 + colW * i + colW / 2;
    doc.setFillColor(...GREEN);
    doc.circle(x, stepsTop, 6, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(i + 1), x, stepsTop + 1.5, { align: 'center', baseline: 'middle' });
    doc.setTextColor(...INK);
    doc.setFontSize(11);
    doc.text(title, x, stepsTop + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(body, colW - 6), x, stepsTop + 19, { align: 'center' });
  });

  // ---- Footer ----
  doc.setDrawColor(223, 230, 216);
  doc.setLineWidth(0.3);
  doc.line(15, H - 18, W - 15, H - 18);
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(import.meta.env.VITE_APP_NAME || 'IT Asset MS', 15, H - 11);
  doc.text('No sign-in needed. Please record every print job so the meter readings match.', W - 15, H - 11, { align: 'right' });
}

/** Makes one A4 page per machine and downloads it. */
export async function downloadQrPosters(machines: PosterMachine[], { base, fileName }: { base?: string; fileName?: string } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  for (const [i, m] of machines.entries()) {
    if (i > 0) doc.addPage();
    await drawPoster(doc, m, base);
  }
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(fileName ?? (machines.length === 1 ? `qr-poster-${slug(machines[0].name)}.pdf` : 'qr-posters-all-machines.pdf'));
}
