export const selectClass =
    'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export const label = (value: string) =>
    value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export type Option = { id: number; name: string };

export type AssetSummary = {
    id: string;
    name: string;
    asset_number: string | null;
    category: string | null;
    serial_number: string | null;
    status: string;
    location: Option | null;
    supplier: Option | null;
};
