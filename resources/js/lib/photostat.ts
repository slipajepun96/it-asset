export type Machine = {
    id: number;
    name: string;
    location: string;
    bw_counter: number;
    color_counter: number;
};

export type AdminMachine = Machine & {
    active: boolean;
    asset_id: string | null;
    asset: { id: string; name: string; asset_number: string | null } | null;
    qr_url: string;
    updated_at: string | null;
};

export type PhotostatRecord = {
    id: number;
    machine_id: number;
    machine_name: string | null;
    user_id: number | null;
    user_name: string;
    bw: number;
    color: number;
    bw_before: number;
    color_before: number;
    purpose: string;
    source: 'app' | 'qr';
    created_at: string;
};

export type MeterReading = {
    id: number;
    machine_id: number;
    machine_name: string | null;
    bw_reading: number;
    color_reading: number;
    bw_expected: number;
    color_expected: number;
    bw_diff: number;
    color_diff: number;
    note: string;
    initial: boolean;
    created_by_name: string;
    created_at: string;
    latest: boolean;
};

export const fmtNum = (n: number | null | undefined) => new Intl.NumberFormat('en-MY').format(n ?? 0);

export const fmtDateTime = (v: string | Date | null | undefined) =>
    v
        ? new Date(v).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '';

export const fmtDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);

    return new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });
};

export const digits = (v: string, max = 7) => v.replace(/\D/g, '').slice(0, max);

export const totals = (records: PhotostatRecord[]) => ({
    bw: records.reduce((a, r) => a + r.bw, 0),
    color: records.reduce((a, r) => a + r.color, 0),
    count: records.length,
});

/** Totals per person. QR records have a typed name and no account, so names are matched ignoring case. */
export function byPerson(records: PhotostatRecord[]) {
    const map = new Map<string, { name: string; bw: number; color: number; count: number }>();

    for (const r of records) {
        const key = r.user_id ? `id:${r.user_id}` : `name:${r.user_name.trim().toLowerCase()}`;
        const u = map.get(key) ?? { name: r.user_name, bw: 0, color: 0, count: 0 };
        u.bw += r.bw;
        u.color += r.color;
        u.count += 1;
        map.set(key, u);
    }

    return [...map.values()].sort((a, b) => b.bw + b.color - (a.bw + a.color));
}
