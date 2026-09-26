<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public array $staffData;

    public function __construct(array $staffData)
    {
        $this->staffData = $staffData;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Reshel Oco Hair Salon Staff Account',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff-account-created',
        );
    }
}