import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { byPerson, fmtDateTime, fmtNum, monthLabel } from '@/lib/photostat';
import type { MeterReading, PhotostatRecord } from '@/lib/photostat';

// Same deep green as the app header.
const GREEN: [number, number, number] = [20, 83, 45];
const MUTED: [number, number, number] = [91, 107, 95];
const MARGIN = 14;

const tableStyle: Partial<UserOptions> & { styles: Record<string, unknown>; headStyles: Record<string, unknown> } = {
  theme: 'striped' as const,
  margin: { left: MARGIN, right: MARGIN },
  styles: { fontSize: 9, cellPadding: 1.8, overflow: 'linebreak' },
  headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' as const },
  alternateRowStyles: { fillColor: [247, 249, 243] },
};

// Opening = the count before the month's first record; closing = after its last record.
function byMachine(records: PhotostatRecord[]) {
  const map = new Map<number, { name: string; bwOpen: number; colorOpen: number; bwClose: number; colorClose: number; bw: number; color: number; count: number }>();
  for (const r of [...records].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))) {
    const m = map.get(r.machine_id) ?? {
      name: r.machine_name ?? '',
      bwOpen: r.bw_before,
      colorOpen: r.color_before,
      bwClose: 0,
      colorClose: 0,
      bw: 0,
      color: 0,
      count: 0,
    };
    m.bw += r.bw;
    m.color += r.color;
    m.count += 1;
    m.bwClose = r.bw_before + r.bw;
    m.colorClose = r.color_before + r.color;
    map.set(r.machine_id, m);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const num = (n: number) => ({ content: fmtNum(n), styles: { halign: 'right' as const } });

/**
 * Builds the monthly photostat report and downloads it.
 * records: the month's records (any order); machineName: the filter's label; generatedBy: who made it.
 */
export function downloadPhotostatPdf({
  records,
  readings = [],
  month,
  machineName,
  generatedBy,
}: {
  records: PhotostatRecord[];
  readings?: MeterReading[];
  month: string;
  machineName: string;
  generatedBy: string;
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalBw = records.reduce((a, r) => a + r.bw, 0);
  const totalColor = records.reduce((a, r) => a + r.color, 0);

  // ---- Title ----
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Photostat Usage Report', MARGIN, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${monthLabel(month)}  ·  ${machineName}`, MARGIN, 19);
  doc.setFontSize(8);
  doc.text(import.meta.env.VITE_APP_NAME || 'IT Asset MS', pageWidth - MARGIN, 12, { align: 'right' });

  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(`Generated ${fmtDateTime(new Date())} by ${generatedBy}`, MARGIN, 32);

  // ---- Summary ----
  autoTable(doc, {
    ...tableStyle,
    startY: 36,
    head: [['B&W pages', 'Colour pages', 'Total pages', 'Records']],
    body: [[num(totalBw), num(totalColor), num(totalBw + totalColor), num(records.length)]],
    styles: { ...tableStyle.styles, fontSize: 11, fontStyle: 'bold' as const },
    headStyles: { ...tableStyle.headStyles, halign: 'right' as const },
  });

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const section = (title: string) => {
    const y = lastY() + 9;
    doc.setTextColor(20, 40, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    return y + 2;
  };

  // ---- Meter checks: the real meter against what users recorded ----
  if (readings.length) {
    const diffCell = (d: number) => ({
      content: d === 0 ? 'Matches' : d > 0 ? `+${fmtNum(d)} not recorded` : `${fmtNum(-d)} over-recorded`,
      styles: { halign: 'right' as const, fontStyle: (d === 0 ? 'normal' : 'bold') as 'normal' | 'bold', textColor: (d === 0 ? [21, 128, 61] : d > 0 ? [161, 98, 7] : [185, 28, 28]) as [number, number, number] },
    });
    const sum = (k: 'bw_diff' | 'color_diff') => readings.reduce((a, r) => a + r[k], 0);
    autoTable(doc, {
      ...tableStyle,
      startY: section('Meter checks'),
      head: [[
        'Date',
        'Machine',
        ...['B&W meter', 'B&W counted', 'B&W difference', 'Colour meter', 'Colour counted', 'Colour difference'].map((t) => ({ content: t, styles: { halign: 'right' as const } })),
      ]],
      body: [...readings]
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
        .map((r) => [fmtDateTime(r.created_at), r.machine_name ?? '', num(r.bw_reading), num(r.bw_expected), diffCell(r.bw_diff), num(r.color_reading), num(r.color_expected), diffCell(r.color_diff)]),
      foot: [[{ content: 'Total difference', colSpan: 4 }, diffCell(sum('bw_diff')), { content: '', colSpan: 2 }, diffCell(sum('color_diff'))]],
      footStyles: { fillColor: [236, 252, 203], textColor: [20, 83, 45], fontStyle: 'bold' as const },
      styles: { ...tableStyle.styles, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 28 } },
    });
  }

  if (records.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(10);
    doc.text('No records for this month.', MARGIN, lastY() + 10);
  } else {
    // ---- By machine (with meter readings) ----
    autoTable(doc, {
      ...tableStyle,
      startY: section('By machine'),
      head: [
        [
          { content: 'Machine', rowSpan: 2, styles: { valign: 'bottom' as const } },
          { content: 'B&W meter', colSpan: 3, styles: { halign: 'center' as const } },
          { content: 'Colour meter', colSpan: 3, styles: { halign: 'center' as const } },
          { content: 'Records', rowSpan: 2, styles: { valign: 'bottom' as const, halign: 'right' as const } },
        ],
        ['Opening', 'Closing', 'Used', 'Opening', 'Closing', 'Used'].map((t) => ({ content: t, styles: { halign: 'right' as const } })),
      ],
      body: byMachine(records).map((m) => [
        m.name,
        num(m.bwOpen),
        num(m.bwClose),
        { content: fmtNum(m.bw), styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
        num(m.colorOpen),
        num(m.colorClose),
        { content: fmtNum(m.color), styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
        num(m.count),
      ]),
    });

    // ---- By person ----
    autoTable(doc, {
      ...tableStyle,
      startY: section('By person'),
      head: [['Name', ...['Records', 'B&W', 'Colour', 'Total'].map((t) => ({ content: t, styles: { halign: 'right' as const } }))]],
      body: byPerson(records).map((u) => [u.name, num(u.count), num(u.bw), num(u.color), num(u.bw + u.color)]),
      foot: [['Total', num(records.length), num(totalBw), num(totalColor), num(totalBw + totalColor)]],
      footStyles: { fillColor: [236, 252, 203], textColor: [20, 83, 45], fontStyle: 'bold' as const },
    });

    // ---- Every record, oldest first ----
    autoTable(doc, {
      ...tableStyle,
      startY: section('All records'),
      head: [['Date', 'Machine', 'Name', ...['B&W', 'Colour'].map((t) => ({ content: t, styles: { halign: 'right' as const } })), 'Purpose']],
      body: [...records]
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
        .map((r) => [fmtDateTime(r.created_at), r.machine_name ?? '', r.user_name + (r.source === 'qr' && !r.user_id ? ' (QR)' : ''), num(r.bw), num(r.color), r.purpose || '']),
      columnStyles: { 0: { cellWidth: 34 }, 3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 45 } },
      styles: { ...tableStyle.styles, fontSize: 8 },
    });
  }

  // ---- Page numbers ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    const y = doc.internal.pageSize.getHeight() - 8;
    doc.text(`Photostat Usage Report · ${monthLabel(month)}`, MARGIN, y);
    doc.text(`Page ${i} of ${pages}`, pageWidth - MARGIN, y, { align: 'right' });
  }

  const slug = machineName === 'All machines' ? 'all' : machineName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`photostat-report-${month}-${slug}.pdf`);
}
