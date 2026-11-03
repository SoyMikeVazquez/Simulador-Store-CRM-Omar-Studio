import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, customerName, total, items, isCustomDesign } = body;

    if (!resend) {
      console.warn('[Resend API] API key no configurada. El correo simulado fue:', { to, subject });
      return NextResponse.json({ success: true, message: 'Resend API key no configurada (Modo desarrollo)' });
    }

    const recipientEmail = to || 'admin@omarstudio.com.mx';
    const ownerEmail = process.env.OWNER_EMAIL || 'admin@omarstudio.com.mx';

    // Enviar al cliente
    const customerEmailResponse = await resend.emails.send({
      from: 'Ventas <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: subject || (isCustomDesign ? 'Solicitud de Cotización Recibida' : 'Confirmación de Pedido y Nota de Venta'),
      html: html || `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #18181b;">¡Hola, ${customerName}!</h2>
          <p>${isCustomDesign ? 'Hemos recibido tu solicitud de diseño personalizado. En breve nuestro equipo te contactará con la cotización.' : 'Gracias por tu compra. Adjunto a este correo encontrarás el resumen de tu nota de venta.'}</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Resumen del Pedido:</p>
            <p style="margin: 0 0 5px 0;">Total: $${total?.toLocaleString()} MXN</p>
          </div>
          <p style="color: #52525b; font-size: 14px;">Si tienes alguna duda, responde directamente a este correo.</p>
        </div>
      `,
    });

    // Enviar notificación al propietario
    await resend.emails.send({
      from: 'Notificaciones CRM <onboarding@resend.dev>',
      to: [ownerEmail],
      subject: `[CRM] ${isCustomDesign ? 'Nueva Solicitud de Cotización' : 'Nuevo Pedido Pagado'} - ${customerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h3 style="color: #18181b;">Nueva actividad en la plataforma</h3>
          <p><strong>Cliente:</strong> ${customerName}</p>
          <p><strong>Tipo:</strong> ${isCustomDesign ? 'Diseño Personalizado (Pendiente Cotizar)' : 'Pedido Estándar (Pagado)'}</p>
          <p><strong>Monto:</strong> $${total?.toLocaleString()} MXN</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, customerEmailResponse });
  } catch (error: any) {
    console.error('Error enviando correo con Resend:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
