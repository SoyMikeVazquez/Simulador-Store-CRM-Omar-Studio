'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, Image as ImageIcon, Check, ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateNotaPdf, NotaVentaInfo } from '../../pdf_generator_logic/generateNotaPdf';
import { sendUserRegistrationOwnerNotification, sendOrderConfirmationToClient } from '@/lib/resend';

interface Producto {
  id: string;
  nombre: string;
  precio_base: number;
  mini_descripcion: string;
  medida_ancho: number;
  medida_alto: number;
  medida2_ancho?: number | null;
  medida2_alto?: number | null;
  descuentos_por_volumen: any;
}

const WATER_BASED_WAXES = [
  { name: 'Rojo', color: '#ef4444' },
  { name: 'Rosa', color: '#ec4899' },
  { name: 'Naranja', color: '#f97316' },
  { name: 'Morado', color: '#a855f7' },
  { name: 'Amarillo', color: '#eab308' },
  { name: 'Azul rey', color: '#2563eb' },
  { name: 'Azul turquesa', color: '#06b6d4' },
  { name: 'Verde', color: '#10b981' },
];

interface OrderItem {
  producto: Producto;
  cantidad: number;
  labelFile?: File | null;
  labelPreview?: string | null;
  label2File?: File | null;
  label2Preview?: string | null;
  color?: string;
  designMode?: 'full' | 'logo' | 'custom';
}

interface CartItem extends OrderItem {
  cartItemId: string;
}

export default function OrderPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local configuration for each product card
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem>>({});
  
  // The actual cart array containing all added variants
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout States
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerStreet, setCustomerStreet] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const requiresInvoice = true;
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    const isLocal = ['altamira', 'tampico', 'miramar', 'la pedrera', 'madero', 'ciudad madero'].includes(customerCity.trim().toLowerCase());
    if (isLocal) {
      setCustomerState('Tamaulipas');
    }
  }, [customerCity]);
  
  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('productos_mayoreo')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data) {
          setProductos(data);
          
          // Initialize order items with quantity 0
          const initialItems: Record<string, OrderItem> = {};
          data.forEach(p => {
            initialItems[p.id] = { 
              producto: p, 
              cantidad: 0, 
              labelFile: null, 
              labelPreview: null, 
              label2File: null,
              label2Preview: null,
              color: p.nombre.includes('Base Agua') ? WATER_BASED_WAXES[0].name : 'Blanco', 
              designMode: 'full' 
            };
          });
          setOrderItems(initialItems);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  const handleQuantityChange = (id: string, delta: number) => {
    setOrderItems(prev => {
      const current = prev[id];
      if (!current) return prev;
      
      let newQuantity = current.cantidad;
      if (current.cantidad === 0 && delta > 0) {
        newQuantity = 5;
      } else {
        newQuantity = Math.max(0, current.cantidad + delta);
      }
      
      return {
        ...prev,
        [id]: { ...current, cantidad: newQuantity }
      };
    });
  };

  const handleManualQuantity = (id: string, value: string) => {
    const parsed = parseInt(value) || 0;
    setOrderItems(prev => {
       const current = prev[id];
       if (!current) return prev;
       return {
         ...prev,
         [id]: { ...current, cantidad: Math.max(0, parsed) }
       };
    });
  };

  const handleLabelUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>, isSecondary: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setOrderItems(prev => ({
        ...prev,
        [id]: isSecondary 
          ? { ...prev[id], label2File: file, label2Preview: previewUrl }
          : { ...prev[id], labelFile: file, labelPreview: previewUrl }
      }));
    }
  };

  // Helper for discounts
  const getDiscountedPrice = (prod: Producto, quantity: number) => {
    if (!prod.descuentos_por_volumen || !Array.isArray(prod.descuentos_por_volumen)) {
      return prod.precio_base;
    }
    const sortedDiscounts = [...prod.descuentos_por_volumen].sort((a, b) => b.cantidad - a.cantidad);
    const applicableDiscount = sortedDiscounts.find(d => quantity >= d.cantidad);
    
    if (applicableDiscount) {
      const discountAmount = prod.precio_base * (applicableDiscount.porcentaje / 100);
      return prod.precio_base - discountAmount;
    }
    return prod.precio_base;
  };

  const isLocalShipping = ['altamira', 'tampico', 'miramar', 'la pedrera', 'madero', 'ciudad madero'].includes(customerCity.trim().toLowerCase());
  const baseShippingCost = isLocalShipping ? 80 : 250;
  
  const hasCustomDesign = cart.some(item => item.designMode === 'custom');
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrice = cart.reduce((sum, item) => {
    return sum + (item.cantidad * getDiscountedPrice(item.producto, item.cantidad));
  }, 0);
  
  const shippingFee = baseShippingCost;
  const ivaAmount = (totalPrice + shippingFee) * 0.16;
  const finalTotal = totalPrice + shippingFee + ivaAmount;

  const hasLidLabel = (prod: Producto) => {
    const n = prod.nombre.toLowerCase();
    if (n.includes('after shave') || n.includes('minoxidil') || n.includes('polvo') || n.includes('textura')) {
      return false;
    }
    return Boolean(prod.medida2_ancho && prod.medida2_alto);
  };

  const handleAddToCart = (prodId: string) => {
    const config = orderItems[prodId];
    if (!config || config.cantidad <= 0) return;

    if (config.designMode === 'full') {
      if (config.producto.medida_ancho && config.producto.medida_alto && !config.labelFile) {
        alert(`Para agregar ${config.producto.nombre} al carrito, debes subir la etiqueta del cuerpo con las medidas requeridas (${config.producto.medida_ancho} x ${config.producto.medida_alto} px) o seleccionar otra opción de diseño.`);
        return;
      }
      if (hasLidLabel(config.producto) && !config.label2File) {
        alert(`Por favor sube la etiqueta de la tapa (${config.producto.medida2_ancho} x ${config.producto.medida2_alto} px) o seleccionar otra opción de diseño.`);
        return;
      }
    } else if (config.designMode === 'logo') {
      if (!config.labelFile) {
        alert(`Para agregar ${config.producto.nombre} al carrito, debes subir tu logo.`);
        return;
      }
    }

    setCart(prev => [...prev, { ...config, cartItemId: crypto.randomUUID() }]);
    
    // Reset local config
    setOrderItems(prev => ({
      ...prev,
      [prodId]: { 
        producto: config.producto, 
        cantidad: 0, 
        labelFile: null, 
        labelPreview: null, 
        label2File: null,
        label2Preview: null,
        color: config.producto.nombre.includes('Base Agua') ? WATER_BASED_WAXES[0].name : 'Blanco',
        designMode: 'full'
      }
    }));
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  // Helper to map local images since DB schema is uncertain
  const getImageUrl = (prod: Producto) => {
    const dbImage = (prod as any).imagen_producto;
    if (dbImage && typeof dbImage === 'string') return dbImage;
    
    const n = prod.nombre.toLowerCase();
    if (n.includes('after shave')) return '/productos/after_shave.jpeg';
    if (n.includes('minoxidil')) return '/productos/minoxidil.jpeg';
    if (n.includes('polvo') || n.includes('textura')) return '/productos/polvo_textura.jpeg';
    if (n.includes('pet')) return '/productos/envases_pet.jpeg';
    if (n.includes('aluminio')) return '/productos/envases_metalicos.jpeg';
    return '/productos/1.jpeg'; // fallback
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) return;
    
    setIsSubmitting(true);
    
    try {
      const notaData: NotaVentaInfo = {
        folio: Math.floor(Math.random() * 10000) + 1,
        es_recibo: false,
        cliente_nombre: customerName,
        cliente_direccion: `${customerStreet}, ${customerCity}, ${customerState}, ${customerZip}` || "N/A",
        cliente_telefono: customerPhone || "N/A",
        cliente_correo: customerEmail,
        total: finalTotal,
        subtotal: totalPrice,
        descuento_especial: 0,
        aplica_iva: requiresInvoice,
        iva: ivaAmount,
        envio: shippingFee,
        anticipo: 0,
        items: cart.map(item => ({
          cantidad: item.cantidad,
          nombre: `${item.producto.nombre}${item.color && item.producto.nombre.includes('Base Agua') ? ` (${item.color})` : ''}${item.designMode === 'custom' ? ' [Diseño Personalizado]' : item.designMode === 'logo' ? ' [Logo Personalizado]' : ' [Etiqueta Propia]'}`,
          precio_unitario: getDiscountedPrice(item.producto, item.cantidad),
          total: item.cantidad * getDiscountedPrice(item.producto, item.cantidad)
        })),
        created_at: new Date()
      };

      // Si tiene diseño personalizado, el estado inicial en el CRM es 'pendiente' (cotización)
      // Si no tiene diseño personalizado, el estado es 'comprado' (pagado y finalizado)
      const pedidoEstado = hasCustomDesign ? 'pendiente' : 'comprado';

      // Subir archivos al bucket 'etiquetas'
      const archivosPayload: Record<string, string> = {};
      for (const item of cart) {
        if (item.labelFile) {
          const fileTypeStr = item.designMode === 'logo' ? 'logo' : 'disenio_propio';
          const safeName = item.producto.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
          const safeFileName = item.labelFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `pedido_${fileTypeStr}_${Date.now()}_${safeFileName}`;
          try {
            const { data: uploadData, error: uploadError } = await supabase.storage.from('eriquetas').upload(fileName, item.labelFile, { cacheControl: '3600', upsert: false });
            if (uploadError) {
              console.error('Supabase upload error:', uploadError);
            }
            if (uploadData) {
              const { data: publicUrlData } = supabase.storage.from('eriquetas').getPublicUrl(fileName);
              archivosPayload[`${fileTypeStr}_${safeName}`] = publicUrlData.publicUrl;
            }
          } catch (e) {
            console.warn('Error subiendo diseño de carrito:', e);
          }
        }
      }

      const pedidoData = {
        cliente_nombre: customerName,
        cliente_email: customerEmail,
        telefono: customerPhone,
        direccion: customerStreet,
        ciudad: customerCity,
        estado: customerState,
        codigo_postal: customerZip,
        status: 'pendiente',
        requiere_factura: requiresInvoice,
        iva: ivaAmount,
        monto_total: finalTotal,
        archivos: Object.keys(archivosPayload).length > 0 ? archivosPayload : null,
        articulos: notaData.items
      };

      let { error } = await supabase.from('pedidos').insert([pedidoData]);
      if (error && error.message && error.message.includes('archivos')) {
        console.warn("Columna 'archivos' no existe en pedidos. Reintentando sin la columna...");
        const { archivos, ...pedidoDataFallback } = pedidoData;
        const retryRes = await supabase.from('pedidos').insert([pedidoDataFallback]);
        error = retryRes.error;
      }
      if (error) {
        console.error("Error en Supabase:", error.message, error.details, error.hint);
        throw new Error(error.message || 'Error al guardar el pedido en la base de datos');
      }

      // Deshabilitado por el momento: No generar ni descargar PDF de la Nota de Venta de inmediato
      // if (!hasCustomDesign) {
      //   await generateNotaPdf(notaData);
      // }

      // Enviar correo de notificación a los propietarios vía Resend API (Compatible con Web Estática)
      try {
        const itemsSummary = notaData.items.map(it => `• ${it.cantidad}x ${it.nombre} ($${it.total.toLocaleString()} MXN)`).join('\n');
        
        // 1. Notificar al dueño
        await sendUserRegistrationOwnerNotification({
          userName: customerName,
          userEmail: customerEmail,
          phone: customerPhone,
          address: `${customerStreet}, ${customerCity}, ${customerState}, ${customerZip}`,
          source: `Pedido Mayoreo (${hasCustomDesign ? 'Diseño Personalizado' : 'Pedido Estándar'})`,
          details: `Total: $${finalTotal.toLocaleString()} MXN\nArtículos:\n${itemsSummary}`,
        });

        // 2. Notificar al cliente
        await sendOrderConfirmationToClient({
          userName: customerName,
          userEmail: customerEmail,
          phone: customerPhone,
          address: `${customerStreet}, ${customerCity}, ${customerState}, ${customerZip}`,
          details: `Total: $${finalTotal.toLocaleString()} MXN\nArtículos:\n${itemsSummary}`,
        });
      } catch (emailErr) {
        console.warn('Advertencia al enviar correo por Resend:', emailErr);
      }
      
      setOrderSuccess(true);
      setShowCheckout(false);
      setCart([]); // Limpiar carrito
    } catch (err: any) {
      console.error('Error en checkout:', err);
      alert(`Ocurrió un error: ${err?.message || 'Error desconocido al procesar la solicitud.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        .desktop-cart-list { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
        @media (max-width: 768px) {
          .desktop-cart-list { display: none !important; }
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: '#f8f9fa', color: '#18181b', fontFamily: 'system-ui, sans-serif' }}>
        {/* Header */}
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="https://omarstudio.com.mx" style={{ color: '#18181b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={20} /> Página principal
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, marginLeft: 'auto' }}>Pedido de Mayoreo</h1>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#18181b' }}>
            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#52525b' }}>
            No hay productos disponibles en este momento.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {productos.map((prod) => {
              const orderItem = orderItems[prod.id];
              const isSelected = orderItem && orderItem.cantidad > 0;
              
              return (
                <div key={prod.id} style={{ 
                  background: isSelected ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid #18181b' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s',
                  overflow: 'hidden'
                }}>
                  {/* Image 1:1 Container */}
                  <div style={{ width: '100%', aspectRatio: '1/1', background: '#f1f3f5', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getImageUrl(prod)}
                      alt={prod.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{prod.nombre}</h3>
                      <div style={{ textAlign: 'right' }}>
                        {orderItem && orderItem.cantidad > 0 && getDiscountedPrice(prod, orderItem.cantidad) < prod.precio_base ? (
                           <>
                             <span style={{ fontSize: '0.9rem', color: '#52525b', textDecoration: 'line-through', marginRight: '0.5rem' }}>${prod.precio_base}</span>
                             <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>${getDiscountedPrice(prod, orderItem.cantidad)}</span>
                           </>
                        ) : (
                           <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#18181b' }}>${prod.precio_base}</span>
                        )}
                      </div>
                    </div>
                    
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#52525b', minHeight: '40px' }}>
                      {prod.mini_descripcion}
                    </p>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.5rem', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#52525b' }}>Cantidad:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => handleQuantityChange(prod.id, -1)} style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#18181b', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <input 
                        type="number"
                        min="0"
                        value={orderItem?.cantidad || 0}
                        onChange={(e) => handleManualQuantity(prod.id, e.target.value)}
                        style={{ width: '40px', textAlign: 'center', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', color: '#18181b', padding: '0.2rem', fontSize: '0.9rem', fontWeight: 700 }}
                      />
                      <button onClick={() => handleQuantityChange(prod.id, 1)} style={{ width: 32, height: 32, borderRadius: '6px', background: '#18181b', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderTop: '1px solid rgba(0,0,0,0.1)', borderRadius: '0 0 8px 8px' }}>
                      {prod.nombre.includes('Base Agua') && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: '#18181b' }}>
                            Color de la Cera
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {WATER_BASED_WAXES.map(colorPreset => (
                              <button
                                key={colorPreset.name}
                                onClick={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], color: colorPreset.name } }))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.3rem 0.6rem',
                                  background: orderItem?.color === colorPreset.name ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)',
                                  border: orderItem?.color === colorPreset.name ? '1px solid #18181b' : '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  fontSize: '0.75rem',
                                  color: orderItem?.color === colorPreset.name ? '#fff' : 'rgba(255,255,255,0.6)'
                                }}
                              >
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: colorPreset.color }} />
                                {colorPreset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {prod.nombre.includes('Mate') && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: '#18181b' }}>
                            Color de la Cera
                          </p>
                          <div style={{ fontSize: '0.75rem', color: '#52525b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffffff', border: '1px solid #444' }} />
                            Blanco (Por defecto para Base Mate)
                          </div>
                        </div>
                      )}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: '#18181b' }}>
                          Opciones de Diseño
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: orderItem.designMode === 'full' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '6px', border: orderItem.designMode === 'full' ? '1px solid #18181b' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <input 
                              type="radio" 
                              name={`designMode-${prod.id}`}
                              checked={orderItem.designMode === 'full'}
                              onChange={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], designMode: 'full' } }))}
                              style={{ accentColor: '#18181b', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 500 }}>Sube tu diseño completo (Etiqueta Propia)</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: orderItem.designMode === 'logo' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '6px', border: orderItem.designMode === 'logo' ? '1px solid #18181b' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <input 
                              type="radio" 
                              name={`designMode-${prod.id}`}
                              checked={orderItem.designMode === 'logo'}
                              onChange={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], designMode: 'logo' } }))}
                              style={{ accentColor: '#18181b', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 500 }}>Personaliza con tu logo</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: orderItem.designMode === 'custom' ? 'rgba(212, 175, 55, 0.1)' : 'transparent', padding: '0.5rem', borderRadius: '6px', border: orderItem.designMode === 'custom' ? '1px solid #18181b' : '1px solid transparent', transition: 'all 0.2s' }}>
                            <input 
                              type="radio" 
                              name={`designMode-${prod.id}`}
                              checked={orderItem.designMode === 'custom'}
                              onChange={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], designMode: 'custom' } }))}
                              style={{ accentColor: '#18181b', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#18181b', fontWeight: 500 }}>Quiero un diseño personalizado</span>
                          </label>
                        </div>
                      </div>

                      {orderItem.designMode === 'logo' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ padding: '1rem', background: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#fef3c7' }}>
                              ⚠️ Importante sobre tu logo
                            </p>
                            <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                              Sube tu logo en <strong>color blanco o de colores</strong> (evita el color negro). 
                              La imagen debe tener <strong>fondo negro o transparente</strong> (PNG).
                              Lo superpondremos sobre nuestra etiqueta base para crear tu producto.
                            </p>
                          </div>
                          
                          {!orderItem.labelPreview ? (
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.2rem', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}>
                              <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={(e) => handleLabelUpload(prod.id, e, false)} />
                              <Upload size={18} style={{ color: '#52525b', marginBottom: '0.3rem' }} />
                              <span style={{ fontSize: '0.8rem', color: '#52525b', fontWeight: 500 }}>Subir Logo</span>
                            </label>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>Vista Previa:</span>
                              {/* Composite Preview Container */}
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/1', background: '#000', borderRadius: '4px', overflow: 'hidden', backgroundImage: 'url(/productos/plantilla_etiqueta.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                {/* Logo Overlay */}
                                <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: '30%', right: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img src={orderItem.labelPreview} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <div style={{ overflow: 'hidden' }}>
                                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {orderItem.labelFile?.name}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: '#10b981' }}>
                                    <Check size={12} /> Logo Cargado
                                  </span>
                                </div>
                                <button onClick={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], labelFile: null, labelPreview: null } }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
                                  Cambiar Logo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {orderItem.designMode === 'full' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                          {/* Primary Label */}
                          <div>
                            <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.8rem', fontWeight: 600 }}>
                              <ImageIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom', color: '#18181b' }} />
                              {hasLidLabel(prod) ? 'Etiqueta del Cuerpo' : 'Etiqueta del Producto'}
                            </p>
                            <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.75rem', color: '#52525b' }}>
                              Medidas requeridas: <strong>{prod.medida_ancho} x {prod.medida_alto} px</strong>
                            </p>
                            
                            {!orderItem.labelPreview ? (
                              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.2rem', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}>
                                <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={(e) => handleLabelUpload(prod.id, e, false)} />
                                <Upload size={18} style={{ color: '#52525b', marginBottom: '0.3rem' }} />
                                <span style={{ fontSize: '0.8rem', color: '#52525b', fontWeight: 500 }}>Subir diseño ({prod.medida_ancho} x {prod.medida_alto} px)</span>
                              </label>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundImage: `url(${orderItem.labelPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                <div style={{ overflow: 'hidden' }}>
                                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {orderItem.labelFile?.name}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: '#10b981' }}>
                                    <Check size={12} /> Listo
                                  </span>
                                </div>
                                <button onClick={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], labelFile: null, labelPreview: null } }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
                                  Cambiar
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Secondary Label (Tapa) if DB columns exist and product requires lid label */}
                          {hasLidLabel(prod) && (
                            <div>
                              <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.8rem', fontWeight: 600 }}>
                                <ImageIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom', color: '#18181b' }} />
                                Etiqueta de la Tapa
                              </p>
                              <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.75rem', color: '#52525b' }}>
                                Medidas requeridas: <strong>{prod.medida2_ancho} x {prod.medida2_alto} px</strong>
                              </p>
                              
                              {!orderItem.label2Preview ? (
                                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.2rem', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}>
                                  <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={(e) => handleLabelUpload(prod.id, e, true)} />
                                  <Upload size={18} style={{ color: '#52525b', marginBottom: '0.3rem' }} />
                                  <span style={{ fontSize: '0.8rem', color: '#52525b', fontWeight: 500 }}>Subir diseño tapa ({prod.medida2_ancho} x {prod.medida2_alto} px)</span>
                                </label>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                  <div style={{ width: 40, height: 40, borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundImage: `url(${orderItem.label2Preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                  <div style={{ overflow: 'hidden' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                      {orderItem.label2File?.name}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: '#10b981' }}>
                                      <Check size={12} /> Listo
                                    </span>
                                  </div>
                                  <button onClick={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], label2File: null, label2Preview: null } }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
                                    Cambiar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => handleAddToCart(prod.id)}
                        style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', background: '#18181b', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        Añadir al Carrito
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      {totalItems > 0 && !orderSuccess && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #18181b', padding: '1rem 2rem', zIndex: 20, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
          
          <div className="desktop-cart-list" style={{ marginBottom: '1rem' }}>
            {cart.map((item) => (
              <div key={item.cartItemId} style={{ background: '#f8f9fa', border: '1px solid #18181b', borderRadius: '8px', padding: '0.8rem', minWidth: '220px', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.producto.nombre}</span>
                   <button onClick={() => handleRemoveFromCart(item.cartItemId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>X</button>
                 </div>
                 <span style={{ fontSize: '0.75rem', color: '#52525b' }}>Cant: {item.cantidad} | Color: {item.producto.nombre.includes('Base Agua') ? (item.color || WATER_BASED_WAXES[0].name) : 'Blanco'}</span>
                 <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginTop: '0.5rem' }}>${(item.cantidad * getDiscountedPrice(item.producto, item.cantidad)).toLocaleString()} MXN</span>
              </div>
            ))}
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: '#52525b', display: 'block', marginBottom: '0.2rem' }}>Resumen del pedido</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{totalItems} Unidades <span style={{ color: '#18181b', marginLeft: '1rem' }}>${totalPrice.toLocaleString()} MXN</span></span>
            </div>
            <button 
              onClick={() => setShowCheckout(true)}
              style={{ padding: '0.8rem 2rem', background: '#18181b', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
            >
              {hasCustomDesign ? 'Proceder con el Encargo' : 'Proceder al Pago'} <Check size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#ffffff', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', color: '#18181b', padding: '2.5rem', borderRadius: '16px', border: '1px solid #18181b', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem' }}>
              {hasCustomDesign ? 'Solicitud de Encargo (Diseño Personalizado)' : 'Resumen de tu Pedido'}
            </h2>

            {hasCustomDesign && (
              <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#78350f', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
                💡 <strong>Atención:</strong> Has elegido diseño personalizado. Registraremos tus datos y los dueños se contactarán contigo a la brevedad para acordar los detalles y proceder con tu pedido.
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {cart.map(item => (
                <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                   <div>
                     <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem', fontWeight: 600 }}>{item.producto.nombre}</p>
                     <p style={{ margin: 0, fontSize: '0.8rem', color: '#52525b' }}>
                       Cant: {item.cantidad} 
                       {(item.producto.nombre.includes('Base Agua') || item.producto.nombre.includes('Mate')) && (
                         <> | Color: {item.producto.nombre.includes('Base Agua') ? (item.color || WATER_BASED_WAXES[0].name) : 'Blanco'}</>
                       )}
                       {item.designMode === 'custom' ? ' | (Diseño personalizado)' : item.designMode === 'logo' ? ' | (Logo personalizado)' : ' | (Etiqueta propia)'}
                     </p>
                   </div>
                   <div style={{ fontWeight: 700, color: '#18181b' }}>
                     ${(item.cantidad * getDiscountedPrice(item.producto, item.cantidad)).toLocaleString()}
                   </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
                <span style={{ fontWeight: 600 }}>Subtotal ({totalItems} unidades)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18181b' }}>${totalPrice.toLocaleString()} MXN</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#52525b' }}>Envío {isLocalShipping ? '(Local)' : '(Nacional)'}:</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#18181b' }}>${baseShippingCost.toLocaleString()} MXN</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: '#52525b' }}>IVA (16%)</span>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#52525b' }}>${ivaAmount.toLocaleString()} MXN</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid #18181b' }}>
                <span style={{ fontWeight: 800 }}>{hasCustomDesign ? 'Total preliminar' : 'Total a Pagar'}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>${finalTotal.toLocaleString()} MXN</span>
              </div>
            </div>

            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Datos Personales y Dirección</h3>
            <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  required 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={customerEmail} 
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Teléfono</label>
                <input 
                  type="tel" 
                  required 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Ej. 55 1234 5678"
                  style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Calle y Número</label>
                <input 
                  type="text" 
                  required 
                  value={customerStreet} 
                  onChange={e => setCustomerStreet(e.target.value)}
                  placeholder="Ej. Av. Siempre Viva 742"
                  style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Ciudad</label>
                  <input 
                    type="text" 
                    list="ciudades-locales"
                    required 
                    value={customerCity} 
                    onChange={e => setCustomerCity(e.target.value)}
                    placeholder="Ej. Guadalajara"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                  />
                  <datalist id="ciudades-locales">
                    <option value="Tampico" />
                    <option value="Madero" />
                    <option value="Altamira" />
                    <option value="Miramar" />
                    <option value="La Pedrera" />
                  </datalist>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Estado</label>
                  <input 
                    type="text" 
                    required 
                    disabled={isLocalShipping}
                    value={customerState} 
                    onChange={e => setCustomerState(e.target.value)}
                    placeholder="Ej. Jalisco"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: isLocalShipping ? '#f1f3f5' : '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem', opacity: isLocalShipping ? 0.7 : 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#52525b' }}>Código Postal</label>
                <input 
                  type="text" 
                  required 
                  value={customerZip} 
                  onChange={e => setCustomerZip(e.target.value)}
                  placeholder="Ej. 44100"
                  style={{ width: '100%', padding: '0.8rem 1rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#18181b', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowCheckout(false)} style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', color: '#18181b', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '0.9rem', background: '#18181b', border: 'none', color: '#ffffff', fontWeight: 700, borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Procesando...' : 'Confirmar y Enviar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#ffffff', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', color: '#18181b', padding: '3rem 2rem', borderRadius: '16px', border: '1px solid #10b981', width: '100%', maxWidth: '450px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Check size={32} color="#10b981" />
            </div>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', color: '#10b981' }}>¡Pedido Registrado con Éxito!</h2>
            <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '1rem', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> ATENCIÓN: Tu pedido está PENDIENTE
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Para que comencemos a procesarlo, es indispensable que tu pago sea transferido exitosamente a la cuenta que se muestra a continuación.
              </p>
            </div>
            <div style={{ background: '#f8f9fa', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e4e4e7', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
              <div><strong style={{ color: '#18181b' }}>Banco:</strong> BBVA</div>
              <div><strong style={{ color: '#18181b' }}>Titular:</strong> OMAR CHAVEZ</div>
              <div><strong style={{ color: '#18181b' }}>Teléfono:</strong> 833 453 9727</div>
              <div><strong style={{ color: '#18181b' }}>CLABE:</strong> 012 180 01536760721 4</div>
              <div><strong style={{ color: '#18181b' }}>Tarjeta:</strong> 4152 3144 0280 6635</div>
            </div>
            <p style={{ margin: '0 0 2rem 0', color: '#52525b', fontSize: '0.85rem' }}>
              Se ha enviado un correo con los detalles. Una vez realizado el pago, nuestro equipo confirmará tu pedido.
            </p>
            <button onClick={() => { setOrderSuccess(false); window.location.href = '/'; }} style={{ padding: '0.9rem 2rem', background: '#10b981', border: 'none', color: '#ffffff', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', width: '100%' }}>
              Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
