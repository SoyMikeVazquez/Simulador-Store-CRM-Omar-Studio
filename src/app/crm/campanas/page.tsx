'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Mail, Send, Users, Sparkles, Eye, CheckCircle2, AlertCircle, RefreshCw, 
  ExternalLink, ArrowRight, Zap, Gauge, Image as ImageIcon, Trash2, Plus, 
  Search, UserPlus, UploadCloud, CheckSquare, Square
} from 'lucide-react';

interface Contact {
  id: string;
  email: string;
  name: string;
  source: 'pedido' | 'prospecto' | 'manual';
}

const EMAIL_TEMPLATES = [
  {
    id: 'promo_mayoreo',
    name: 'Promoción Mayorista para Barberías',
    badge: 'Recomendada',
    subject: '🔥 Precios Especiales por Volumen en Cosmética y Ceras | Omar Studio',
    preheader: 'Equipa tu barbería con fórmulas premium y personaliza tus etiquetas.',
    headline: 'IMPULSA TU BARBERÍA CON FÓRMULAS DE ALTO RENDIMIENTO',
    bodyText: 'En Omar Labs Studio queremos apoyarte a maximizar los márgenes de tu negocio. Hemos actualizado nuestros precios especiales por volumen en ceras base agua, fijadores, after shaves y polvos de textura.\n\nAdemás, personalizamos los envases con tu propio logo para que vendas tu propia marca.',
    ctaText: 'Ver Catálogo y Precios Mayoreo',
    ctaUrl: 'https://omarstudio.com.mx/order/'
  },
  {
    id: 'nuevo_lanzamiento',
    name: 'Lanzamiento de Nueva Línea',
    badge: 'Novedad',
    subject: '✨ Descubre la nueva línea de productos formulados para barberos profesionales',
    preheader: 'Fórmulas spider, pomadas mate y tratamientos capilares.',
    headline: 'NUEVAS FÓRMULAS Y PRESENTACIONES DISPONIBLES',
    bodyText: 'Te presentamos nuestras nuevas fórmulas de alto rendimiento diseñadas exclusivamente para barberías exigentes. Texturas ligeras, aromas de lujo y fijación duradera.\n\nAccede a nuestro simulador 3D interactivo y visualiza cómo lucirá tu marca en los envases antes de producir.',
    ctaText: 'Abrir Simulador 3D Interactivo',
    ctaUrl: 'https://omarstudio.com.mx/'
  },
  {
    id: 'reabastecimiento',
    name: 'Recordatorio de Reabastecimiento',
    badge: 'Fidelización',
    subject: '📦 ¿Necesitas surtir inventario en tu barbería? Haz tu pedido con envío directo',
    preheader: 'Entregas rápidas y descuentos directos a partir de 5 piezas.',
    headline: 'REABASTECE TU INVENTARIO DE PRODUCTOS',
    bodyText: 'Esperamos que tus ventas sigan creciendo. Si te estás quedando sin stock de ceras o productos de cuidado personal, surte fácilmente tu pedido a través de nuestra tienda mayorista.\n\nGarantizamos tiempo de entrega récord y control de calidad en cada lote.',
    ctaText: 'Hacer Pedido Rápido',
    ctaUrl: 'https://omarstudio.com.mx/order/'
  },
  {
    id: 'personalizado',
    name: 'Campaña en Blanco (Personalizada)',
    badge: 'Libre',
    subject: '',
    preheader: '',
    headline: '',
    bodyText: '',
    ctaText: 'Ver Más Información',
    ctaUrl: 'https://omarstudio.com.mx/'
  }
];

export default function CampanasPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Audience & Selection State
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'pedido' | 'prospecto' | 'manual'>('all');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Image Upload State (Strict 400 KB Limit)
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);

  // Campaign Form State
  const [selectedTemplate, setSelectedTemplate] = useState('promo_mayoreo');
  const [senderName, setSenderName] = useState('Omar Labs Studio');
  const [senderEmail, setSenderEmail] = useState('admin@omarstudio.com.mx');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [preheader, setPreheader] = useState(EMAIL_TEMPLATES[0].preheader);
  const [headline, setHeadline] = useState(EMAIL_TEMPLATES[0].headline);
  const [bodyText, setBodyText] = useState(EMAIL_TEMPLATES[0].bodyText);
  const [ctaText, setCtaText] = useState(EMAIL_TEMPLATES[0].ctaText);
  const [ctaUrl, setCtaUrl] = useState(EMAIL_TEMPLATES[0].ctaUrl);

  // Sending status
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string; details?: any } | null>(null);

  // Daily Quota Management (Brevo 300 Limit)
  const [dailyLimit, setDailyLimit] = useState(300);
  const [creditsUsedToday, setCreditsUsedToday] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(true);

  const getTodayKey = () => {
    const d = new Date();
    return `brevo_sent_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchQuota = async () => {
    setLoadingCredits(true);
    const key = getTodayKey();
    let localSent = 0;
    try {
      const stored = localStorage.getItem(key);
      if (stored) localSent = parseInt(stored, 10) || 0;
    } catch (e) {}

    const apiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY || '';

    try {
      // 1. Get plan send limit from Brevo
      const accRes = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey, 'accept': 'application/json' }
      });
      if (accRes.ok) {
        const accData = await accRes.json();
        const freePlan = accData.plan?.find((p: any) => p.creditsType === 'sendLimit' || p.type === 'free');
        if (freePlan && typeof freePlan.credits === 'number') {
          setDailyLimit(freePlan.credits);
        }
      }

      // 2. Query Brevo SMTP stats for today to reflect actual requests
      const todayIso = new Date().toISOString().split('T')[0];
      const statsRes = await fetch(`https://api.brevo.com/v3/smtp/statistics/reports?startDate=${todayIso}&endDate=${todayIso}`, {
        headers: { 'api-key': apiKey, 'accept': 'application/json' }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        let apiSent = 0;
        if (Array.isArray(statsData.reports)) {
          statsData.reports.forEach((r: any) => {
            apiSent += (r.requests || 0);
          });
        }
        const effectiveSent = Math.max(localSent, apiSent);
        setCreditsUsedToday(effectiveSent);
        try {
          localStorage.setItem(key, String(effectiveSent));
        } catch (e) {}
      } else {
        setCreditsUsedToday(localSent);
      }
    } catch (err) {
      setCreditsUsedToday(localSent);
    } finally {
      setLoadingCredits(false);
    }
  };

  const recordCreditsUsed = (count: number) => {
    setCreditsUsedToday(prev => {
      const updated = prev + count;
      try {
        localStorage.setItem(getTodayKey(), String(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Fetch contacts from Supabase tables: 'pedidos' and 'prospectos'
  const loadContacts = async () => {
    setLoadingContacts(true);
    const collected: Contact[] = [];
    const seenEmails = new Set<string>();

    try {
      // 1. Clientes desde tabla 'pedidos' (pedidos de tienda / cotizaciones)
      const { data: pedidos } = await supabase.from('pedidos').select('cliente_email, cliente_nombre');
      if (pedidos) {
        pedidos.forEach((p, idx) => {
          const email = (p.cliente_email || '').trim().toLowerCase();
          if (email && email.includes('@') && !seenEmails.has(email)) {
            seenEmails.add(email);
            collected.push({
              id: `ped_${idx}_${email}`,
              email,
              name: p.cliente_nombre ? p.cliente_nombre.trim() : 'Cliente Mayorista',
              source: 'pedido'
            });
          }
        });
      }

      // 2. Leads desde tabla 'prospectos' (capturados desde el simulador 3D)
      const { data: prospectos } = await supabase.from('prospectos').select('email, nombre');
      if (prospectos) {
        prospectos.forEach((p, idx) => {
          const email = (p.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !seenEmails.has(email)) {
            seenEmails.add(email);
            collected.push({
              id: `prosp_${idx}_${email}`,
              email,
              name: p.nombre ? p.nombre.trim() : 'Prospecto 3D',
              source: 'prospecto'
            });
          }
        });
      }

      setContacts(prev => {
        // preserve manual contacts added during current session
        const manuals = prev.filter(c => c.source === 'manual' && !seenEmails.has(c.email));
        const combined = [...manuals, ...collected];
        // Select all by default upon first load
        setSelectedEmails(new Set(combined.map(c => c.email.toLowerCase())));
        return combined;
      });
    } catch (err) {
      console.error('Error al cargar contactos de audiencia desde Supabase:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadContacts();
    fetchQuota();
  }, []);

  const creditsRemaining = Math.max(0, dailyLimit - creditsUsedToday);
  const percentageRemaining = Math.max(0, Math.min(100, Math.round((creditsRemaining / dailyLimit) * 100)));

  // Add manual contact to audience
  const handleAddManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newContactEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      alert('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (contacts.some(c => c.email.toLowerCase() === cleanEmail)) {
      setSelectedEmails(prev => new Set([...prev, cleanEmail]));
      alert('Este contacto ya existía en la lista y ha sido seleccionado automáticamente.');
      setNewContactEmail('');
      setNewContactName('');
      return;
    }

    const newContact: Contact = {
      id: `manual_${Date.now()}`,
      email: cleanEmail,
      name: newContactName.trim() || cleanEmail.split('@')[0],
      source: 'manual'
    };

    setContacts(prev => [newContact, ...prev]);
    setSelectedEmails(prev => new Set([...prev, cleanEmail]));
    setNewContactEmail('');
    setNewContactName('');
  };

  // Remove manual contact
  const handleRemoveContact = (email: string) => {
    setContacts(prev => prev.filter(c => c.email.toLowerCase() !== email.toLowerCase()));
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.delete(email.toLowerCase());
      return next;
    });
  };

  // Toggle single contact selection
  const toggleContactSelection = (email: string) => {
    const low = email.toLowerCase();
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(low)) next.delete(low);
      else next.add(low);
      return next;
    });
  };

  // Bulk selection controls
  const handleSelectAll = () => {
    setSelectedEmails(new Set(contacts.map(c => c.email.toLowerCase())));
  };

  const handleDeselectAll = () => {
    setSelectedEmails(new Set());
  };

  // Filtered contacts based on search and tab filter
  const displayedContacts = useMemo(() => {
    return contacts.filter(c => {
      if (contactFilter !== 'all' && c.source !== contactFilter) return false;
      if (contactSearch.trim()) {
        const q = contactSearch.toLowerCase().trim();
        return c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [contacts, contactFilter, contactSearch]);

  // Compute active recipient list from manually checked contacts
  const activeRecipients = useMemo(() => {
    return contacts
      .filter(c => selectedEmails.has(c.email.toLowerCase()))
      .map(c => ({ email: c.email, name: c.name }));
  }, [contacts, selectedEmails]);

  // Handle Image Upload (Strict 400 KB Limit) to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 400 KB limit (400 * 1024 = 409,600 bytes)
    const MAX_SIZE_BYTES = 400 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      alert(`⚠️ La imagen pesa ${(file.size / 1024).toFixed(1)} KB, lo cual supera el límite máximo permitido de 400 KB.\n\nPor favor optimiza o comprime la imagen antes de subirla.`);
      e.target.value = '';
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `campanas/${Date.now()}_${cleanName}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('eriquetas')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('eriquetas')
        .getPublicUrl(filePath);

      setImageUrl(publicUrlData.publicUrl);
      setImageSizeKb(Math.round(file.size / 1024));
    } catch (err: any) {
      console.error('Error al subir imagen a Supabase Storage:', err);
      alert('Error al subir la imagen: ' + (err.message || 'Verifica la conexión a Supabase'));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Apply template
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === id);
    if (tmpl && id !== 'personalizado') {
      setSubject(tmpl.subject);
      setPreheader(tmpl.preheader);
      setHeadline(tmpl.headline);
      setBodyText(tmpl.bodyText);
      setCtaText(tmpl.ctaText);
      setCtaUrl(tmpl.ctaUrl);
    }
  };

  // Generate responsive HTML for email
  const buildHtmlContent = (recipientName: string = 'Colega') => {
    const paragraphs = bodyText
      .split('\n')
      .filter(p => p.trim())
      .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #d4d4d8; font-size: 15px;">${p.replace('{{nombre}}', recipientName)}</p>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0b0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${preheader}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0b0b; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #141414; border: 1px solid rgba(238, 223, 198, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
          
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="background-color: #eedfc6;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 20px; font-weight: 800; letter-spacing: 0.1em; color: #eedfc6; text-transform: uppercase;">
                OMAR LABS STUDIO
              </span>
              <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #71717a; margin-top: 4px;">
                Cosmética & Ceras de Lujo
              </span>
            </td>
          </tr>

          <!-- Campaign Banner Image -->
          ${imageUrl ? `
          <tr>
            <td style="padding: 0; text-align: center; background-color: #000000; line-height: 0;">
              <img src="${imageUrl}" alt="Omar Labs Studio" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border: 0;" />
            </td>
          </tr>
          ` : ''}

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 800; line-height: 1.25; color: #ffffff; letter-spacing: 0.02em; text-transform: uppercase;">
                ${headline}
              </h1>

              ${paragraphs}

              <!-- CTA Button -->
              ${ctaText && ctaUrl ? `
              <div style="margin: 32px 0 16px 0; text-align: center;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #eedfc6; color: #0b0b0b; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 20px rgba(238, 223, 198, 0.3);">
                  ${ctaText} →
                </a>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #0e0e0e; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">
                Omar Labs Studio | Tampico & Altamira, Tamaulipas, México.
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                Has recibido este mensaje porque estás registrado como cliente o prospecto de mayoreo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  };

  // Send email helper (Direct Brevo API call compatible with Next.js static export)
  const sendEmailThroughBrevo = async (toRecipients: { email: string; name?: string }[]) => {
    const html = buildHtmlContent();
    const payload = {
      sender: {
        name: senderName || 'Omar Labs Studio',
        email: senderEmail || 'admin@omarstudio.com.mx'
      },
      to: toRecipients.map(r => ({
        email: r.email.trim(),
        name: r.name ? r.name.trim() : r.email.split('@')[0]
      })),
      subject,
      htmlContent: html,
      textContent: `${headline}\n\n${bodyText}\n\n${ctaText}: ${ctaUrl}`
    };

    const apiKey = process.env.NEXT_PUBLIC_BREVO_API_KEY || '';

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Error al enviar por Brevo', details: data };
      }
      return { success: true, messageId: data.messageId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de red con Brevo' };
    }
  };

  // Handle Test Send
  const handleSendTest = async () => {
    if (creditsRemaining < 1) {
      alert(`Has alcanzado el límite diario de ${dailyLimit} correos de Brevo para hoy. El cupo se renueva a la medianoche (00:00 hrs).`);
      return;
    }
    if (!testEmail || !testEmail.includes('@')) {
      alert('Ingresa un correo válido para enviar la prueba.');
      return;
    }
    setSendingTest(true);
    setStatusMessage(null);

    try {
      const data = await sendEmailThroughBrevo([{ email: testEmail, name: 'Prueba' }]);
      if (data.success) {
        recordCreditsUsed(1);
        setStatusMessage({
          type: 'success',
          text: `¡Correo de prueba enviado con éxito a ${testEmail}! (1 crédito consumido, restan ${creditsRemaining - 1} hoy).`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Error de Brevo: ${data.error}`,
          details: data.details
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error de conexión: ${err.message}`
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Bulk Send
  const handleSendBulk = async () => {
    if (activeRecipients.length === 0) {
      alert('No hay destinatarios seleccionados para enviar la campaña.');
      return;
    }

    if (creditsRemaining <= 0) {
      alert(`Has alcanzado el límite diario de ${dailyLimit} correos en Brevo hoy. No es posible enviar más correos hasta la medianoche (00:00 hrs) o hasta actualizar tu plan.`);
      return;
    }

    let recipientsToSend = activeRecipients;
    if (activeRecipients.length > creditsRemaining) {
      const confirmCap = window.confirm(
        `⚠️ CONTROL DE CAPACIDAD DIARIA:\n\nHas seleccionado ${activeRecipients.length} contactos, pero hoy solo te quedan ${creditsRemaining} créditos disponibles (límite de 300 diarios de Brevo).\n\n¿Deseas enviar únicamente a los primeros ${creditsRemaining} contactos para respetar el límite de 300 correos de hoy?\n\n(Aceptar: envía a ${creditsRemaining} contactos | Cancelar: posponer envío)`
      );
      if (!confirmCap) return;
      recipientsToSend = activeRecipients.slice(0, creditsRemaining);
    } else {
      const confirmMsg = `¿Estás seguro de enviar esta campaña a ${recipientsToSend.length} contacto(s) a través de Brevo? (Se consumirán ${recipientsToSend.length} de tus ${creditsRemaining} créditos disponibles hoy)`;
      if (!window.confirm(confirmMsg)) return;
    }

    setSendingBulk(true);
    setStatusMessage(null);

    try {
      const data = await sendEmailThroughBrevo(recipientsToSend);
      if (data.success) {
        recordCreditsUsed(recipientsToSend.length);
        const newRemaining = Math.max(0, creditsRemaining - recipientsToSend.length);
        setStatusMessage({
          type: 'success',
          text: `¡Campaña lanzada con éxito a ${recipientsToSend.length} destinatarios vía Brevo! Te quedan ${newRemaining} créditos disponibles hoy.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Error de Brevo: ${data.error}`,
          details: data.details
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al enviar campaña: ${err.message}`
      });
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', background: '#0b0b0b', color: '#ffffff', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', background: '#121212', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
            EMAIL MARKETING AUTOMATION
          </span>
          <h2 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.04em', color: '#ffffff' }}>
            CAMPAÑAS DE CORREO (BREVO)
          </h2>
        </div>
        <button
          onClick={loadContacts}
          disabled={loadingContacts}
          style={{ background: '#1a1a1a', border: '1px solid rgba(238, 223, 198, 0.25)', color: '#eedfc6', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}
        >
          <RefreshCw size={14} className={loadingContacts ? 'animate-spin' : ''} />
          {loadingContacts ? 'Actualizando Contactos...' : 'Recargar Audiencia'}
        </button>
      </div>

      {/* Brevo Capacity Quota Card */}
      <div style={{
        background: 'linear-gradient(135deg, #141414 0%, #181818 100%)',
        border: '1px solid rgba(238, 223, 198, 0.2)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(238, 223, 198, 0.1)', padding: '0.6rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="#eedfc6" />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#eedfc6', fontWeight: 800 }}>
                CONTROL DE CAPACIDAD DIARIA (BREVO API)
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                Créditos Restantes: <span style={{ color: creditsRemaining > 30 ? '#eedfc6' : '#ef4444', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800 }}>{creditsRemaining}</span> / {dailyLimit} envíos hoy
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: creditsRemaining > 50 ? 'rgba(16, 185, 129, 0.12)' : creditsRemaining > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${creditsRemaining > 50 ? 'rgba(16, 185, 129, 0.3)' : creditsRemaining > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: creditsRemaining > 50 ? '#6ee7b7' : creditsRemaining > 0 ? '#fcd34d' : '#fca5a5',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: creditsRemaining > 50 ? '#10b981' : creditsRemaining > 0 ? '#f59e0b' : '#ef4444' }} />
              {creditsRemaining === 0 ? 'Límite diario alcanzado' : `${percentageRemaining}% disponible`}
            </div>

            <button
              onClick={fetchQuota}
              disabled={loadingCredits}
              title="Sincronizar créditos con Brevo"
              style={{
                background: '#1f1f1f',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#eedfc6',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={12} className={loadingCredits ? 'animate-spin' : ''} />
              {loadingCredits ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: '#222222', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${percentageRemaining}%`,
            height: '100%',
            background: creditsRemaining > 50 ? 'linear-gradient(90deg, #d4af37, #eedfc6)' : creditsRemaining > 0 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : '#ef4444',
            borderRadius: '4px',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* Quota details footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.7rem', fontSize: '0.74rem', color: '#71717a', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span>Consumidos hoy: <strong style={{ color: '#d4d4d8' }}>{creditsUsedToday}</strong></span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>Límite diario de tu plan: <strong style={{ color: '#eedfc6' }}>{dailyLimit}</strong></span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>Reinicio: medianoche (00:00 hrs)</span>
          </div>
          
          {activeRecipients.length > creditsRemaining && creditsRemaining > 0 && (
            <div style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <AlertCircle size={13} />
              Tu audiencia ({activeRecipients.length}) excede tus créditos ({creditsRemaining})
            </div>
          )}
        </div>
      </div>

      {/* Brevo IP Warning Alert */}
      {statusMessage?.details?.code === 'unauthorized' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', color: '#fca5a5' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
            <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.3rem' }}>
                Acción requerida en tu cuenta de Brevo: Autorizar IP
              </strong>
              <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Brevo detectó que te estás conectando desde una nueva IP. Para que la API pueda enviar correos, solo debes agregar la IP en la sección de seguridad de Brevo:
              </p>
              <a
                href="https://app.brevo.com/security/authorised_ips"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ef4444', color: '#ffffff', padding: '0.4rem 0.9rem', borderRadius: '6px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Abrir Panel de IPs Autorizadas en Brevo <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Success / Error Notifications */}
      {statusMessage && statusMessage.details?.code !== 'unauthorized' && (
        <div style={{ 
          background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: statusMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
          borderRadius: '10px', 
          padding: '1rem 1.25rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          fontSize: '0.9rem'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Form & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Step 1: Select Audience & Contact Management */}
          <div style={{ background: '#141414', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} color="#eedfc6" /> 1. Audiencia y Selección de Contactos
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '2px', display: 'block' }}>
                  Sincronizado desde Supabase (tablas <code>pedidos</code> y <code>prospectos</code>) + Contactos manuales
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', background: 'rgba(238, 223, 198, 0.12)', color: '#eedfc6', padding: '0.3rem 0.8rem', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(238, 223, 198, 0.25)' }}>
                  {activeRecipients.length} de {contacts.length} contactos seleccionados
                </span>
              </div>
            </div>

            {/* Form to add manual contact */}
            <form onSubmit={handleAddManualContact} style={{ background: '#181818', border: '1px dashed rgba(238, 223, 198, 0.25)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#eedfc6', fontWeight: 800, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <UserPlus size={14} color="#eedfc6" /> Añadir Contacto Manualmente a la Campaña
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr) auto', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="Nombre o Barbería (ej. Barber King)"
                  style={{ padding: '0.65rem 0.85rem', background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                />
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  placeholder="correo@ejemplo.com *"
                  style={{ padding: '0.65rem 0.85rem', background: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#eedfc6',
                    color: '#0b0b0b',
                    border: 'none',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={14} /> + Agregar
                </button>
              </div>
            </form>

            {/* Filter and Bulk Action Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
              {/* Search bar */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={14} color="#71717a" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              {/* Source Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {(['all', 'pedido', 'prospecto', 'manual'] as const).map(f => {
                  const count = f === 'all' ? contacts.length : contacts.filter(c => c.source === f).length;
                  const labels = { all: 'Todos', pedido: 'Pedidos', prospecto: 'Prospectos 3D', manual: 'Manuales' };
                  const isActive = contactFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setContactFilter(f)}
                      style={{
                        padding: '0.4rem 0.65rem',
                        background: isActive ? '#eedfc6' : '#1a1a1a',
                        color: isActive ? '#0b0b0b' : '#a1a1aa',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {labels[f]} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Select / Deselect All */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{ padding: '0.4rem 0.75rem', background: '#1c1c1c', color: '#eedfc6', border: '1px solid rgba(238,223,198,0.25)', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Seleccionar Todos
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{ padding: '0.4rem 0.75rem', background: '#1c1c1c', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ✕ Deseleccionar Todos
                </button>
              </div>
            </div>

            {/* Scrollable Contact Selection List */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', background: '#0e0e0e', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {displayedContacts.length === 0 ? (
                <div style={{ padding: '1.75rem', textAlign: 'center', color: '#71717a', fontSize: '0.85rem' }}>
                  No se encontraron contactos coincidentes.
                </div>
              ) : (
                displayedContacts.map(c => {
                  const isSelected = selectedEmails.has(c.email.toLowerCase());
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleContactSelection(c.email)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isSelected ? 'rgba(238, 223, 198, 0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Row click handles it
                          style={{ accentColor: '#eedfc6', width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#ffffff' : '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.email}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: c.source === 'pedido' ? 'rgba(16, 185, 129, 0.12)' : c.source === 'prospecto' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: c.source === 'pedido' ? '#6ee7b7' : c.source === 'prospecto' ? '#a5b4fc' : '#fcd34d'
                        }}>
                          {c.source === 'pedido' ? 'Pedido' : c.source === 'prospecto' ? 'Prospecto 3D' : 'Manual'}
                        </span>

                        {c.source === 'manual' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveContact(c.email);
                            }}
                            title="Eliminar contacto"
                            style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Choose Template */}
          <div style={{ background: '#141414', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#eedfc6" /> 2. Seleccionar Plantilla
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {EMAIL_TEMPLATES.map(tmpl => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    style={{
                      background: isSelected ? 'rgba(238, 223, 198, 0.08)' : '#1a1a1a',
                      border: isSelected ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#eedfc6', background: 'rgba(238,223,198,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                        {tmpl.badge}
                      </span>
                      {isSelected && <span style={{ color: '#eedfc6', fontSize: '0.85rem' }}>✓</span>}
                    </div>
                    <strong style={{ display: 'block', fontSize: '0.88rem', color: isSelected ? '#ffffff' : '#d4d4d8' }}>
                      {tmpl.name}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Email Editor Form */}
          <div style={{ background: '#141414', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} color="#eedfc6" /> 3. Redactar Contenido
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Nombre del Remitente
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Correo Remitente (Verificado en Brevo)
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={e => setSenderEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Asunto del Correo
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: 🔥 Descuentos especiales para tu barbería"
                style={{ width: '100%', padding: '0.85rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Pre-header (Texto visible antes de abrir el correo)
              </label>
              <input
                type="text"
                value={preheader}
                onChange={e => setPreheader(e.target.value)}
                placeholder="Texto corto complementario..."
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            {/* Campaign Banner Image Upload (Strict 400 KB Limit) */}
            <div style={{ background: '#181818', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#eedfc6', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', letterSpacing: '0.04em' }}>
                  <ImageIcon size={15} color="#eedfc6" /> Imagen / Banner Promocional (Opcional)
                </label>
                <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
                  Límite estricto: <strong style={{ color: '#eedfc6' }}>400 KB</strong> (PNG, JPG, WEBP)
                </span>
              </div>

              {imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121212', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(238, 223, 198, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={imageUrl}
                      alt="Banner preview"
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                        Banner subido a Supabase
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
                        ✓ Listo para el correo {imageSizeKb ? `(${imageSizeKb} KB)` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setImageSizeKb(null); }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Trash2 size={13} /> Quitar Imagen
                  </button>
                </div>
              ) : (
                <div>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: '#121212',
                      border: '1px dashed rgba(238, 223, 198, 0.3)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      cursor: uploadingImage ? 'wait' : 'pointer',
                      transition: 'border 0.2s'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                    <UploadCloud size={24} color="#eedfc6" className={uploadingImage ? 'animate-bounce' : ''} />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#eedfc6' }}>
                        {uploadingImage ? 'Subiendo imagen a Supabase Storage...' : 'Haz clic para subir un Banner o Flyer'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#71717a', marginTop: '2px' }}>
                        Máximo 400 KB • Se alojará en Supabase Storage
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Titular Principal del Correo
              </label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Mensaje Principal
              </label>
              <textarea
                rows={6}
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                placeholder="Escribe el mensaje de la campaña..."
                style={{ width: '100%', padding: '0.85rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', lineHeight: 1.5, outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Texto del Botón (CTA)
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Enlace de Destino (URL)
                </label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>

          </div>

          {/* Step 4: Dispatch Panel */}
          <div style={{ background: '#141414', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Envío y Pruebas
            </h3>

            {/* Test Send Row */}
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: '#1a1a1a', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="correo-personal@ejemplo.com"
                style={{ flex: 1, padding: '0.75rem 1rem', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sendingTest}
                style={{ background: 'transparent', border: '1px solid #eedfc6', color: '#eedfc6', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {sendingTest ? 'Enviando Prueba...' : 'Enviar Prueba'}
              </button>
            </div>

            {/* Quota Alerts before sending */}
            {activeRecipients.length > creditsRemaining && creditsRemaining > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.85rem',
                fontSize: '0.82rem',
                color: '#fcd34d',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>
                  Tu audiencia seleccionada ({activeRecipients.length}) supera el cupo de hoy ({creditsRemaining}). Al enviar, se limitará automáticamente a los primeros <strong>{creditsRemaining}</strong> contactos para respetar el límite de 300.
                </span>
              </div>
            )}

            {creditsRemaining === 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.85rem',
                fontSize: '0.82rem',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>
                  Has agotado el límite de {dailyLimit} envíos de hoy. El cupo se renueva a la medianoche (00:00 hrs).
                </span>
              </div>
            )}

            {/* Bulk Send Button */}
            <button
              type="button"
              onClick={handleSendBulk}
              disabled={sendingBulk || activeRecipients.length === 0 || creditsRemaining === 0}
              className="font-bronco"
              style={{
                width: '100%',
                padding: '1.1rem',
                background: creditsRemaining === 0 ? '#262626' : (activeRecipients.length > creditsRemaining ? '#f59e0b' : '#eedfc6'),
                color: creditsRemaining === 0 ? '#71717a' : '#0b0b0b',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.2rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: (sendingBulk || activeRecipients.length === 0 || creditsRemaining === 0) ? 'not-allowed' : 'pointer',
                opacity: (sendingBulk || activeRecipients.length === 0 || creditsRemaining === 0) ? 0.6 : 1,
                boxShadow: creditsRemaining > 0 ? '0 4px 20px rgba(238, 223, 198, 0.25)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem'
              }}
            >
              <Send size={20} />
              {sendingBulk 
                ? 'Enviando Campaña...' 
                : creditsRemaining === 0
                  ? 'Cupo Diario Agotado (300/300)'
                  : activeRecipients.length > creditsRemaining
                    ? `Enviar a los primeros ${creditsRemaining} contactos (Límite Diario)`
                    : `Lanzar Campaña a ${activeRecipients.length} Contactos`
              }
            </button>
          </div>

        </div>

        {/* Right Column: Live Email Preview */}
        <div style={{ position: 'sticky', top: '1.5rem', background: '#141414', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} color="#eedfc6" /> Vista Previa en Vivo
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Así lo verá el cliente</span>
          </div>

          {/* Inbox Preview Mockup */}
          <div style={{ background: '#0e0e0e', borderRadius: '10px', padding: '0.8rem 1rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
            <div><strong style={{ color: '#eedfc6' }}>De:</strong> {senderName} &lt;{senderEmail}&gt;</div>
            <div style={{ marginTop: '0.2rem' }}><strong style={{ color: '#eedfc6' }}>Asunto:</strong> {subject || '(Sin Asunto)'}</div>
            {preheader && <div style={{ marginTop: '0.2rem', color: '#71717a' }}>{preheader}</div>}
          </div>

          {/* Rendered Email Preview Container */}
          <div style={{ background: '#0b0b0b', border: '1px solid rgba(238,223,198,0.2)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.8)' }}>
            <div style={{ height: '3px', background: '#eedfc6' }} />
            
            <div style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-bronco" style={{ fontSize: '1.3rem', color: '#eedfc6', letterSpacing: '0.08em', display: 'block' }}>
                OMAR LABS STUDIO
              </span>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a' }}>
                Cosmética & Ceras de Lujo
              </span>
            </div>

            {/* Banner Image Preview */}
            {imageUrl && (
              <div style={{ background: '#000000', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <img
                  src={imageUrl}
                  alt="Banner preview"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            <div style={{ padding: '1.75rem 1.5rem' }}>
              <h4 className="font-bronco" style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#ffffff', letterSpacing: '0.03em', lineHeight: 1.25 }}>
                {headline || 'TITULAR DE LA CAMPAÑA'}
              </h4>

              <div style={{ color: '#d4d4d8', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {bodyText || 'Aquí aparecerá el cuerpo principal de tu mensaje...'}
              </div>

              {ctaText && ctaUrl && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.75rem',
                      background: '#eedfc6',
                      color: '#0b0b0b',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      borderRadius: '6px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {ctaText} →
                  </a>
                </div>
              )}
            </div>

            <div style={{ padding: '1.2rem', background: '#0e0e0e', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: '0.72rem', color: '#71717a' }}>
              Omar Labs Studio | Tampico & Altamira, Tamaulipas, México.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

