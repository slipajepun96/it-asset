<?php

namespace App\Enums;

enum AssetStatus: string
{
    case Active = 'active';
    case InRepair = 'in_repair';
    case Retired = 'retired';
    case Lost = 'lost';
}
