<?php

namespace App\Enums;

enum LogType: string
{
    case Problem = 'problem';
    case ComponentSwap = 'component_swap';
    case Maintenance = 'maintenance';
    case Service = 'service';
    case Relocation = 'relocation';
    case Note = 'note';
}
