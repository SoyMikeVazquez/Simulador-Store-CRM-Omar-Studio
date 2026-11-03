export interface PreferenceItem {
  id?: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
}

export interface CreatePreferenceOptions {
  items: PreferenceItem[];
  payer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  external_reference?: string;
  backUrls?: {
    success?: string;
    pending?: string;
    failure?: string;
  };
}

export async function createMercadoPagoPreference(options: CreatePreferenceOptions) {
  const token = 
    process.env.NEXT_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN || 
    process.env.MERCADO_PAGO_ACCESS_TOKEN || 
    process.env.MP_ACCESS_TOKEN || '';

  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://omarstudio.com.mx';
  // Mercado Pago exige que las back_urls sean HTTPS en un dominio público para auto_return.
  // Si estamos en localhost o HTTP, usamos https://omarstudio.com.mx
  const isHttpsPublic = rawOrigin.startsWith('https://') && !rawOrigin.includes('localhost');
  const origin = isHttpsPublic ? rawOrigin : 'https://omarstudio.com.mx';

  const payload: any = {
    items: options.items.map(it => ({
      id: it.id || 'item',
      title: it.title.substring(0, 120),
      quantity: Math.max(1, it.quantity),
      unit_price: Math.max(1, Math.round(it.unit_price * 100) / 100),
      currency_id: it.currency_id || 'MXN'
    })),
    statement_descriptor: 'OMAR LABS STUDIO',
    external_reference: options.external_reference || `PED-${Date.now()}`,
    back_urls: {
      success: `${origin}/order/?pago=exito`,
      pending: `${origin}/order/?pago=pendiente`,
      failure: `${origin}/order/?pago=fallo`
    },
    auto_return: 'approved'
  };

  if (options.payer) {
    payload.payer = {
      name: options.payer.name || 'Cliente Mayorista',
      email: options.payer.email || 'cliente@ejemplo.com'
    };
    if (options.payer.phone) {
      payload.payer.phone = {
        number: options.payer.phone.replace(/[^0-9]/g, '')
      };
    }
  }

  let res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  // Si falló por auto_return o back_urls, reintentamos de forma segura sin auto_return
  if (!res.ok) {
    const errorData = await res.json();
    console.warn('Primer intento de preferencia MP falló, reintentando de forma simplificada:', errorData);

    delete payload.auto_return;
    delete payload.back_urls;

    res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errRetry = await res.json();
      console.error('Error final al crear preferencia en Mercado Pago:', errRetry);
      throw new Error(errRetry.message || 'Error al generar link de Mercado Pago');
    }
  }

  const data = await res.json();
  return {
    id: data.id,
    init_point: data.init_point as string,
    sandbox_init_point: data.sandbox_init_point as string
  };
}

