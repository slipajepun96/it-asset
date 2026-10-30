import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { qr } from '@/routes/assets';

type LabelAsset = {
    id: string;
    name: string;
    asset_number: string | null;
    serial_number: string | null;
};

type Props = { assets: LabelAsset[] };

function Label({ asset }: { asset: LabelAsset }) {
    return (
        <div className="label-card flex w-full max-w-72 flex-col items-center gap-2 rounded border border-black p-4 text-center text-black">
            <img src={qr.url(asset.id)} alt="QR code" className="size-52" />
            {asset.asset_number && <div className="text-lg font-bold">{asset.asset_number}</div>}
            <div className="font-semibold break-words">{asset.name}</div>
            {asset.serial_number && <div className="text-xs break-all">S/N {asset.serial_number}</div>}
            <div className="font-mono text-[8px] break-all">{asset.id}</div>
        </div>
    );
}

export default function AssetLabel({ assets }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <>
            <Head title={assets.length === 1 ? `Label – ${assets[0].name}` : 'Labels'} />
            <style>{`
                #print-labels { display: none; }
                @page { size: A4; margin: 10mm; }
                @media print {
                    body > *:not(#print-labels) { display: none !important; }
                    html, body { margin: 0; padding: 0; background: white; }
                    #print-labels {
                        display: grid; grid-template-columns: repeat(3, 60mm);
                        grid-auto-rows: 90mm; gap: 0; width: 120mm;
                    }
                    .label-card {
                        break-inside: avoid; width: 60mm; height: 90mm;
                        padding: 3mm; gap: 1mm; border-radius: 0;
                        box-sizing: border-box; justify-content: center;
                    }
                    .label-card img { width: 46mm; height: 46mm; }
                }
            `}</style>
            <div className="flex flex-col items-center gap-4 p-4">
                <Button onClick={() => window.print()}>
                    Print {assets.length === 1 ? 'label' : `${assets.length} labels`}
                </Button>
                <div className="flex flex-wrap justify-center gap-4">
                    {assets.map((asset) => (
                        <Label key={asset.id} asset={asset} />
                    ))}
                </div>
            </div>
            {mounted &&
                createPortal(
                    <div id="print-labels">
                        {assets.map((asset) => (
                            <Label key={asset.id} asset={asset} />
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}
