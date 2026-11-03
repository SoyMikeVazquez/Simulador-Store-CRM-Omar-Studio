import { NextResponse } from 'next/server';

const DEFAULT_BREVO_KEY = process.env.BREVO_API_KEY || process.env.NEXT_PUBLIC_BREVO_API_KEY || '';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      apiKey = process.env.BREVO_API_KEY || DEFAULT_BREVO_KEY,
      senderName = 'Omar Labs Studio',
      senderEmail = 'admin@omarstudio.com.mx',
      recipients = [],
      subject,
      htmlContent,
      textContent
    } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Debes incluir al menos un destinatario.' }, { status: 400 });
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'El asunto y el contenido del correo son obligatorios.' }, { status: 400 });
    }

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: recipients.map((r: { email: string; name?: string }) => ({
        email: r.email.trim(),
        name: r.name ? r.name.trim() : r.email.split('@')[0]
      })),
      subject,
      htmlContent,
      textContent: textContent || subject
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        error: data.message || 'Error al comunicarse con la API de Brevo', 
        details: data 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, messageId: data.messageId || data.messageIds });

  } catch (error: any) {
    console.error('Error en API Brevo:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

