<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_sent_to_sign_in()
    {
        $this->get(route('home'))->assertRedirect(route('login'));
    }
}
