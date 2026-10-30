import { Paperclip } from 'lucide-react';
import type { Attachment } from '@/lib/asset-ui';
import { show } from '@/routes/attachments';

const fileSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function LogAttachments({ files }: { files: Attachment[] }) {
    if (files.length === 0) {
        return null;
    }

    return (
        <ul className="mt-2 flex flex-wrap gap-2">
            {files.map((f) => (
                <li key={f.id} className="max-w-full">
                    <a
                        href={show.url(f.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-muted hover:bg-accent inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                    >
                        <Paperclip className="size-3.5 shrink-0" />
                        <span className="truncate">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{fileSize(f.size)}</span>
                    </a>
                </li>
            ))}
        </ul>
    );
}
