import { format, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const FORMAT = 'yyyy-MM-dd';

export function DatePicker({
    name,
    defaultValue,
    placeholder = 'Pick a date',
}: {
    name: string;
    defaultValue?: string | null;
    placeholder?: string;
}) {
    const [value, setValue] = useState<string>(defaultValue ?? '');
    const [open, setOpen] = useState(false);
    const selected = value ? parse(value, FORMAT, new Date()) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <input type="hidden" name={name} value={value} />
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                >
                    <CalendarIcon />
                    {selected ? format(selected, 'PPP') : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selected}
                    defaultMonth={selected}
                    onSelect={(date) => {
                        setValue(date ? format(date, FORMAT) : '');
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
