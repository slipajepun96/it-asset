<?php

namespace App\Enums;

enum LocationType: string
{
    case Office = 'office';
    case Estate = 'estate';
    case Warehouse = 'warehouse';
    case Other = 'other';
}
