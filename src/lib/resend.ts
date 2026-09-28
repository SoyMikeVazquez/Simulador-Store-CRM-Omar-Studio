/**
 * Resend Email Notification Helper for Static Web Applications.
 * Since Next.js uses static export (`output: 'export'`), server-side API routes are disabled.
 * This helper calls Supabase Edge Functions to send notification emails to the barbershop owners.
 */

import { supabase } from './supabase';

const OWNER_EMAILS = process.env.NEXT_PUBLIC_OWNER_EMAIL
  ? process.env.NEXT_PUBLIC_OWNER_EMAIL.split(',').map((email) => email.trim())
  : [];
const FALLBACK_TEST_EMAIL = 'admin@omarstudio.com.mx';

export interface UserRegistrationPayload {
  userName: string;
  userEmail: string;
  source?: string;
  phone?: string;
  address?: string;
  details?: string;
}

/**
 * Sends a notification email ONLY to the barbershop owners whenever a new user registers or places an order.
 */
export async function sendUserRegistrationOwnerNotification({
  userName,
  userEmail,
  source = 'Simulador 3D (Registro de Prospecto)',
  phone,
  address,
  details,
}: UserRegistrationPayload) {
  try {
    const formattedDate = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const isOrder = source.toLowerCase().includes('pedido') || source.toLowerCase().includes('mayoreo');

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #12141a; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #18181b 0%, #09090b 100%); padding: 24px; text-align: center; border-bottom: 2px solid #d4af37;">
          <h1 style="color: #d4af37; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">
            ✂️ Omar Labs Studio
          </h1>
          <p style="color: #a1a1aa; margin: 6px 0 0 0; font-size: 13px;">Notificación de ${isOrder ? 'Nuevo Pedido' : 'Registro de Usuario'}</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 28px; background-color: #18181b;">
          <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; margin-bottom: 16px; border-left: 4px solid #d4af37; padding-left: 10px;">
            ${isOrder ? '🛍️ ¡Se ha recibido un nuevo pedido!' : '👤 ¡Nuevo Registro de Usuario!'}
          </h2>
          
          <p style="color: #d4d4d8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            ${isOrder 
              ? 'Un cliente ha enviado una solicitud de pedido desde la plataforma.' 
              : 'Se ha registrado un nuevo usuario en el simulador 3D para personalizar sus productos.'}
          </p>
          
          <div style="background-color: rgba(255, 255, 255, 0.04); padding: 20px; border-radius: 10px; border: 1px solid rgba(212, 175, 55, 0.2); margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; color: #ffffff; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; width: 130px; font-weight: 500;">👤 Nombre:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #ffffff;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; font-weight: 500;">✉️ Correo:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #d4af37;">
                  <a href="mailto:${userEmail}" style="color: #d4af37; text-decoration: underline;">${userEmail}</a>
                </td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; font-weight: 500;">📞 Teléfono:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${phone}</td>
              </tr>
              ` : ''}
              ${address ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; font-weight: 500;">🏠 Dirección:</td>
                <td style="padding: 8px 0; color: #ffffff;">${address}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; font-weight: 500;">📍 Tipo / Origen:</td>
                <td style="padding: 8px 0; color: #ffffff;">${source}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; font-weight: 500;">🕒 Fecha / Hora:</td>
                <td style="padding: 8px 0; color: #a1a1aa; font-size: 13px;">${formattedDate}</td>
              </tr>
            </table>
          </div>

          ${details ? `
          <div style="background-color: rgba(212, 175, 55, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.3); margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: 700; color: #d4af37; font-size: 13px;">📋 Detalle de la Solicitud:</p>
            <p style="margin: 0; color: #e4e4e7; font-size: 13px; white-space: pre-wrap;">${details}</p>
          </div>
          ` : ''}

          <div style="text-align: center; background-color: rgba(212, 175, 55, 0.1); border: 1px dashed #d4af37; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <span style="color: #d4af37; font-size: 13px; font-weight: 600;">
              💡 Aviso exclusivo para los propietarios de la barbería
            </span>
          </div>

          <p style="color: #71717a; font-size: 12px; margin: 0; text-align: center;">
            Este correo fue enviado automáticamente por el sistema de registro de Omar Labs Studio via Resend.
          </p>
        </div>
      </div>
    `;

    // Enviar correo a través de Supabase Edge Function para evitar el problema de CORS
    const payload = {
      isOrder,
      userName,
      userEmail,
      source,
      details,
      htmlContent
    };

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload
    });

    if (error) {
      console.warn('[Resend via Edge Function] Error al enviar correo al propietario:', error);
      return { success: false, error };
    }

    console.log('[Resend via Edge Function] Correo enviado exitosamente al propietario:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Resend Direct Fetch] Excepción al enviar correo:', error);
    return { success: false, error: error?.message || error };
  }
}

/**
 * Sends a confirmation email to the client after they place an order.
 */
export async function sendOrderConfirmationToClient({
  userName,
  userEmail,
  address,
  details,
}: UserRegistrationPayload) {
  try {
    const formattedDate = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7;">
        
        <div style="background-color: #18181b; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">
            Omar Labs Studio
          </h1>
          <p style="color: #a1a1aa; margin: 6px 0 0 0; font-size: 14px;">Confirmación de Pedido</p>
        </div>
        
        <div style="padding: 28px;">
          <h2 style="color: #18181b; font-size: 20px; margin-top: 0; margin-bottom: 16px;">
            ¡Hola ${userName}!
          </h2>
          
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hemos recibido tu pedido correctamente. Nuestro equipo lo está revisando y pronto se contactará contigo para continuar con el proceso.
          </p>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e4e4e7; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; font-weight: 700; color: #18181b; font-size: 15px;">Detalles de tu pedido:</p>
            <p style="margin: 0 0 8px 0; color: #52525b; font-size: 14px;"><strong>Fecha:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 8px 0; color: #52525b; font-size: 14px;"><strong>Dirección de envío:</strong> ${address}</p>
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;" />
            <p style="margin: 0; color: #52525b; font-size: 14px; white-space: pre-wrap;">${details}</p>
          </div>

          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Si seleccionaste un diseño estándar, recuerda realizar tu pago a los datos bancarios indicados al finalizar tu compra. Si es un diseño personalizado, nos contactaremos contigo para acordar los detalles y el pago.
          </p>
          
          <p style="color: #52525b; font-size: 14px; margin: 0;">
            Gracias por confiar en Omar Labs Studio.
          </p>
        </div>
      </div>
    `;

    const payload = {
      isOrder: true,
      isClient: true,
      to: userEmail,
      subject: 'Confirmación de Pedido - Omar Labs Studio',
      userName,
      userEmail,
      details,
      htmlContent
    };

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload
    });

    if (error) {
      console.warn('[Resend Client] Error al enviar correo al cliente:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Resend Client] Excepción:', error);
    return { success: false, error: error?.message || error };
  }
}
