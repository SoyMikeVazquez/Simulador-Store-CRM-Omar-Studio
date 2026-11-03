'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, Check, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateNotaPdf, NotaVentaInfo, NotaItem } from '../../pdf_generator_logic/generateNotaPdf';
import { sendUserRegistrationOwnerNotification, sendOrderConfirmationToClient } from '@/lib/resend';
import { createMercadoPagoPreference } from '@/lib/mercadopago';

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
  imagen_producto?: string;
}

const FALLBACK_PRODUCTS: Producto[] = [
  {
    id: "b74bf422-aff5-4f0c-9b70-71aa8038a413",
    nombre: "Cera Spider 150 Gr (PET Transparente)",
    precio_base: 63,
    mini_descripcion: "Envase PET Transparente 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792271493108_Premium_Black_and_Gold_Spider_Wax_Jar.png"
  },
  {
    id: "5241d906-fef1-4e4e-8ddf-ea4eed21d7df",
    nombre: "Aceite para barba (50ml)",
    precio_base: 65,
    mini_descripcion: "Presentación 50ml",
    descuentos_por_volumen: [],
    medida_ancho: 100,
    medida_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792270910969_Premium_Blue_Beard_Oil_Dropper_Bottle.png"
  },
  {
    id: "3a8e2450-26de-4989-9d20-ab8bd039b645",
    nombre: "Cera Pigmento Negro 150 Gr (PET Transparente)",
    precio_base: 63,
    mini_descripcion: "Envase PET Transparente 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792270151531_Luxury_Black_and_Gold_Pigment_Wax_Jar.png"
  },
  {
    id: "df468c3b-2636-4655-a4bb-987c9c02e853",
    nombre: "Cera Pasta Mate 150 Gr (Aluminio Gris)",
    precio_base: 70,
    mini_descripcion: "Envase Aluminio Gris 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792267628943_Premium_Silver_Hair_Wax_Tin.png"
  },
  {
    id: "a0c3b938-a65c-4732-800d-168b5b6e427b",
    nombre: "Cera Pasta Mate 150 Gr (Aluminio Negro)",
    precio_base: 70,
    mini_descripcion: "Envase Aluminio Negro 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792266673440_Luxury_Black-and-Gold_Hair_Wax_Tin.png"
  },
  {
    id: "1458beba-a01d-4dc3-ac12-a57b736a927f",
    nombre: "Cera Pasta Mate 150 Gr (PET Transparente)",
    precio_base: 63,
    mini_descripcion: "Envase PET Transparente 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792268688108_Premium_Matte_Hair_Wax_Jar.png"
  },
  {
    id: "81bd1584-a44c-4251-8303-025331eba80d",
    nombre: "Minoxidil 5% (30ml)",
    precio_base: 75,
    mini_descripcion: "Presentación 30ml",
    descuentos_por_volumen: [],
    medida_ancho: 85,
    medida_alto: 35,
    medida2_ancho: 40,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792260038369_Elegant_Minoxidil_Spray_Bottle_Product_Shot.png"
  },
  {
    id: "2f765f01-f4e6-4c83-9b6e-4d5a6833dcae",
    nombre: "After Shave 500ml",
    precio_base: 72,
    mini_descripcion: "Presentación 500ml",
    descuentos_por_volumen: [],
    medida_ancho: 180,
    medida_alto: 120,
    medida2_ancho: 50,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792260405260_after_shave_seis_colores_900x900_v2.png"
  },
  {
    id: "480ea95b-bc20-4fd8-82c2-9934fc4361cf",
    nombre: "Polvo de Textura 40g (Envase Negro)",
    precio_base: 60,
    mini_descripcion: "Envase Negro 40g",
    descuentos_por_volumen: [],
    medida_ancho: 100,
    medida_alto: 70,
    medida2_ancho: 50,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792260653014_Premium_Black-and-Gold_Texture_Powder_Bottle.png"
  },
  {
    id: "a571fcba-e429-4037-bcc8-cac4b41faaf8",
    nombre: "Polvo de Textura 100g (Envase Negro)",
    precio_base: 80,
    mini_descripcion: "Envase Negro 80g",
    descuentos_por_volumen: [],
    medida_ancho: 120,
    medida_alto: 90,
    medida2_ancho: 50,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792260941818_Premium_Black_Texture_Powder_Bottle__1_.png"
  },
  {
    id: "c1fc8239-fb86-4af9-8bef-bd03e10b6351",
    nombre: "Cera Base Agua 150g (PET Transparente)",
    precio_base: 55,
    mini_descripcion: "Envase PET Transparente 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792261490819_Seven-Color_Premium_Pomade_Jar_Display.png"
  },
  {
    id: "99206e20-3234-4dae-a4f9-3141eb6827f7",
    nombre: "Cera Mate 150g (Aluminio Negro)",
    precio_base: 65,
    mini_descripcion: "Envase Aluminio Negro 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 70,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792266581425_cera_mate_900x900.png"
  },
  {
    id: "dbce579a-0fdc-43e7-84d7-3f92fd440b91",
    nombre: "Cera Base Agua 150g (Aluminio Negro)",
    precio_base: 62,
    mini_descripcion: "Envase Aluminio Negro 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792262828694_cera_base_agua_7_colores_900x900.png"
  },
  {
    id: "692e1fc7-1d08-4653-b3dc-fe0707608d01",
    nombre: "Cera Base Agua 150g (Aluminio Gris)",
    precio_base: 62,
    mini_descripcion: "Envase Aluminio Gris 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792267021946_cera_base_agua_7_colores_gris_900x900__2_.png"
  },
  {
    id: "56a76801-dc45-4c61-b181-2a10909c6707",
    nombre: "Cera Mate 150g (Aluminio Gris)",
    precio_base: 65,
    mini_descripcion: "Envase Aluminio Gris 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792267754599_Elegant_Silver_Hair_Wax_Tin_Mockup.png"
  },
  {
    id: "fdaef098-43f5-47ad-9c28-9335dc0d2186",
    nombre: "After Shave 250ml",
    precio_base: 52,
    mini_descripcion: "Presentación 250ml",
    descuentos_por_volumen: [],
    medida_ancho: 140,
    medida_alto: 100,
    medida2_ancho: 50,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792259076532_after_shave_seis_colores_900x900.png"
  },
  {
    id: "2e5da36f-e123-4730-8f36-fbe2ef293f50",
    nombre: "Cera Mate 150g (PET Transparente)",
    precio_base: 58,
    mini_descripcion: "Envase PET Transparente 150g",
    descuentos_por_volumen: [],
    medida_ancho: 1600,
    medida_alto: 108,
    medida2_ancho: 800,
    medida2_alto: 800,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792268358300_Luxury_Black_and_Gold_Matte_Wax_Jar.png"
  },
  {
    id: "9033842a-c047-42fb-83cf-244c1d4d1964",
    nombre: "Minoxidil 5% (50ml)",
    precio_base: 90,
    mini_descripcion: "Presentación 50ml",
    descuentos_por_volumen: [],
    medida_ancho: 100,
    medida_alto: 45,
    medida2_ancho: 50,
    medida2_alto: 50,
    imagen_producto: "https://zxkvyajmvkxufsogsrug.supabase.co/storage/v1/object/public/eriquetas/producto_presentacion_1792259823281_Elegant_Black_Minoxidil_Spray_Bottle__1_.png"
  }
];

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
  color?: string;
  hasCustomDesign?: boolean;
}

interface CartItem extends OrderItem {
  cartItemId: string;
}

const createInitialOrderItems = (products: Producto[]): Record<string, OrderItem> => {
  const initialItems: Record<string, OrderItem> = {};
  products.forEach(p => {
    initialItems[p.id] = { 
      producto: p, 
      cantidad: 0, 
      color: (p.nombre && p.nombre.includes('Base Agua')) ? WATER_BASED_WAXES[0].name : 'Blanco', 
      hasCustomDesign: false 
    };
  });
  return initialItems;
};

export default function OrderPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(false);
  
  // Local configuration for each product card (initialized with fallback catalog immediately)
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem>>(() => createInitialOrderItems(FALLBACK_PRODUCTS));
  
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
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'transferencia'>('mercadopago');
  const [mercadoPagoUrl, setMercadoPagoUrl] = useState<string | null>(null);
  const [pagoStatus, setPagoStatus] = useState<'exito' | 'pendiente' | 'fallo' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get('pago');
      if (pago === 'exito') setPagoStatus('exito');
      else if (pago === 'pendiente') setPagoStatus('pendiente');
      else if (pago === 'fallo') setPagoStatus('fallo');
    }
  }, []);

  useEffect(() => {
    const isLocal = ['altamira', 'tampico', 'miramar', 'la pedrera', 'madero', 'ciudad madero'].includes(customerCity.trim().toLowerCase());
    if (isLocal) {
      setCustomerState('Tamaulipas');
    }
  }, [customerCity]);
  
  const initializeProducts = (data: Producto[]) => {
    setProductos(data);
    const initialItems: Record<string, OrderItem> = {};
    data.forEach(p => {
      initialItems[p.id] = { 
        producto: p, 
        cantidad: 0, 
        color: (p.nombre && p.nombre.includes('Base Agua')) ? WATER_BASED_WAXES[0].name : 'Blanco', 
        hasCustomDesign: false 
      };
    });
    setOrderItems(initialItems);
  };

  useEffect(() => {
    let isCancelled = false;

    async function fetchProducts() {
      // Emergency timeout to guarantee the user is NEVER left on an infinite spinner
      const timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setLoading(false);
          setProductos(prev => (prev.length === 0 ? FALLBACK_PRODUCTS : prev));
          setOrderItems(prev => {
            if (Object.keys(prev).length === 0) {
              const fallbackItems: Record<string, OrderItem> = {};
              FALLBACK_PRODUCTS.forEach(p => {
                fallbackItems[p.id] = {
                  producto: p,
                  cantidad: 0,
                  color: (p.nombre && p.nombre.includes('Base Agua')) ? WATER_BASED_WAXES[0].name : 'Blanco',
                  hasCustomDesign: false
                };
              });
              return fallbackItems;
            }
            return prev;
          });
        }
      }, 3000);

      try {
        const { data, error } = await supabase
          .from('productos_mayoreo')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.warn('Error fetching with created_at, trying fallback select:', error);
          const fallbackRes = await supabase.from('productos_mayoreo').select('*');
          if (fallbackRes.data && fallbackRes.data.length > 0) {
            if (!isCancelled) initializeProducts(fallbackRes.data);
            return;
          }
          throw error;
        }
        
        if (data && data.length > 0) {
          if (!isCancelled) initializeProducts(data);
        } else {
          if (!isCancelled) initializeProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.error('Error fetching products from Supabase, applying fallback catalog:', err);
        if (!isCancelled) initializeProducts(FALLBACK_PRODUCTS);
      } finally {
        clearTimeout(timeoutId);
        if (!isCancelled) setLoading(false);
      }
    }
    
    fetchProducts();

    return () => {
      isCancelled = true;
    };
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
  
  const hasCustomDesign = cart.some(item => item.hasCustomDesign);
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalCustomDesignCost = cart.reduce((sum, item) => sum + (item.hasCustomDesign ? 150 : 0), 0);
  const totalProductsPrice = cart.reduce((sum, item) => {
    return sum + (item.cantidad * getDiscountedPrice(item.producto, item.cantidad));
  }, 0);
  const totalPrice = totalProductsPrice + totalCustomDesignCost;
  
  const shippingFee = baseShippingCost;
  const ivaAmount = (totalPrice + shippingFee) * 0.16;
  const finalTotal = totalPrice + shippingFee + ivaAmount;

  const handleAddToCart = (prodId: string) => {
    const config = orderItems[prodId];
    if (!config || config.cantidad <= 0) return;

    setCart(prev => [...prev, { ...config, cartItemId: crypto.randomUUID() }]);
    
    // Reset local config
    setOrderItems(prev => ({
      ...prev,
      [prodId]: { 
        producto: config.producto, 
        cantidad: 0, 
        color: (config.producto.nombre && config.producto.nombre.includes('Base Agua')) ? WATER_BASED_WAXES[0].name : 'Blanco',
        hasCustomDesign: false
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
    
    const n = (prod.nombre || '').toLowerCase();
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
      const notaItems: NotaItem[] = [];
      cart.forEach(item => {
        const unitPrice = getDiscountedPrice(item.producto, item.cantidad);
        notaItems.push({
          cantidad: item.cantidad,
          nombre: `${item.producto.nombre}${item.color && item.producto.nombre.includes('Base Agua') ? ` (${item.color})` : ''}${item.hasCustomDesign ? ' [Diseño Personalizado]' : ''}`,
          precio_unitario: unitPrice,
          total: item.cantidad * unitPrice
        });
        if (item.hasCustomDesign) {
          notaItems.push({
            cantidad: 1,
            nombre: `Diseño Personalizado - ${item.producto.nombre}`,
            precio_unitario: 150,
            total: 150
          });
        }
      });

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
        items: notaItems,
        created_at: new Date()
      };

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
        archivos: null,
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

      // Generar preferencia de pago con Mercado Pago Checkout Pro
      let mpLink: string | null = null;
      try {
        const mpItems: { id: string; title: string; quantity: number; unit_price: number }[] = [];
        
        cart.forEach(item => {
          mpItems.push({
            id: item.producto.id,
            title: `${item.producto.nombre}${item.color && item.producto.nombre.includes('Base Agua') ? ` (${item.color})` : ''}`.substring(0, 120),
            quantity: item.cantidad,
            unit_price: getDiscountedPrice(item.producto, item.cantidad)
          });
          if (item.hasCustomDesign) {
            mpItems.push({
              id: `diseno-${item.producto.id}`,
              title: `Diseño Personalizado - ${item.producto.nombre}`.substring(0, 120),
              quantity: 1,
              unit_price: 150
            });
          }
        });

        if (shippingFee > 0) {
          mpItems.push({
            id: 'envio',
            title: `Costo de Envío (${isLocalShipping ? 'Local Tampico/Madero' : 'Nacional México'})`,
            quantity: 1,
            unit_price: shippingFee
          });
        }

        if (requiresInvoice && ivaAmount > 0) {
          mpItems.push({
            id: 'iva',
            title: 'IVA (16%) Facturación',
            quantity: 1,
            unit_price: ivaAmount
          });
        }

        const pref = await createMercadoPagoPreference({
          items: mpItems,
          payer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: `${customerStreet}, ${customerCity}, ${customerState}`
          },
          external_reference: `PED-${Date.now()}`
        });

        if (pref && pref.init_point) {
          mpLink = pref.init_point;
          setMercadoPagoUrl(pref.init_point);
        }
      } catch (mpErr) {
        console.warn('Advertencia al generar preferencia de Mercado Pago:', mpErr);
      }

      // Deshabilitado por el momento: No generar ni descargar PDF de la Nota de Venta de inmediato
      // if (!hasCustomDesign) {
      //   await generateNotaPdf(notaData);
      // }

      // Enviar correo de notificación a los propietarios vía Resend API (Compatible con Web Estática)
      try {
        const itemsSummary = notaData.items.map(it => `• ${it.cantidad}x ${it.nombre} ($${it.total.toLocaleString()} MXN)`).join('\n');
        const paymentDetailsText = mpLink 
          ? `\n\nEnlace de Pago en Línea Mercado Pago:\n${mpLink}`
          : `\n\nMétodo de Pago: Transferencia Manual BBVA`;
        
        // 1. Notificar al dueño
        await sendUserRegistrationOwnerNotification({
          userName: customerName,
          userEmail: customerEmail,
          phone: customerPhone,
          address: `${customerStreet}, ${customerCity}, ${customerState}, ${customerZip}`,
          source: `Pedido Mayoreo (${hasCustomDesign ? 'Diseño Personalizado' : 'Pedido Estándar'})`,
          details: `Total: $${finalTotal.toLocaleString()} MXN${paymentDetailsText}\n\nArtículos:\n${itemsSummary}`,
        });

        // 2. Notificar al cliente
        await sendOrderConfirmationToClient({
          userName: customerName,
          userEmail: customerEmail,
          phone: customerPhone,
          address: `${customerStreet}, ${customerCity}, ${customerState}, ${customerZip}`,
          details: `Total: $${finalTotal.toLocaleString()} MXN${paymentDetailsText}\n\nArtículos:\n${itemsSummary}`,
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
        .products-grid-5 {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 1400px) {
          .products-grid-5 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 1.1rem;
          }
        }
        @media (max-width: 1100px) {
          .products-grid-5 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 768px) {
          .products-grid-5 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.9rem;
          }
        }
        @media (max-width: 480px) {
          .products-grid-5 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: '#0b0b0b', color: '#ffffff', fontFamily: 'var(--font-outfit), sans-serif' }}>
        {/* Header */}
        <header style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0e0e0e', position: 'sticky', top: 0, zIndex: 30 }}>
          <Link href="https://omarstudio.com.mx" style={{ color: '#eedfc6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s' }}>
            <ArrowLeft size={18} /> omarstudio.com.mx
          </Link>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
              PROGRAMA MAYORISTA OFICIAL
            </span>
            <h1 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.04em', color: '#eedfc6', fontFamily: "'Bronco', 'BroncoPersonalUse', serif", textTransform: 'uppercase' }}>
              TIENDA DE MAYOREO
            </h1>
          </div>
        </header>

        {/* Hero Section Banner */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111111', padding: '2.5rem 1.5rem 1.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <span style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: 'rgba(238, 223, 198, 0.1)', border: '1px solid rgba(238, 223, 198, 0.25)', borderRadius: '20px', fontSize: '0.7rem', color: '#eedfc6', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Catálogo de Fórmulas y Personalización
            </span>
            <h2 className="font-bronco" style={{ margin: 0, fontSize: '2.2rem', color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1.1, fontFamily: "'Bronco', 'BroncoPersonalUse', serif", textTransform: 'uppercase' }}>
              EQUIPA TU BARBER SHOP HOY
            </h2>
            <p style={{ margin: '0.75rem 0 0 0', color: '#a1a1aa', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Selecciona tus productos, cantidades y sube tus etiquetas para tu propia marca. Precios especiales por volumen.
            </p>
          </div>
        </div>

        {/* Main Content (5 products per row) */}
        <main style={{ maxWidth: '1680px', margin: '0 auto', padding: '2rem 1.5rem', paddingBottom: '120px' }}>
          
          {/* Payment Feedback Banner (Mercado Pago Return) */}
          {pagoStatus === 'exito' && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#6ee7b7',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  🎉 ¡PAGO CONFIRMADO CON ÉXITO!
                </strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0' }}>
                  Mercado Pago procesó tu pago correctamente. Tu pedido ya está confirmado y el equipo de Omar Labs Studio comenzará la producción.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPagoStatus(null)}
                style={{ background: 'transparent', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Cerrar Aviso ✕
              </button>
            </div>
          )}

          {pagoStatus === 'pendiente' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fcd34d',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  ⏳ PAGO PENDIENTE DE ACREDITACIÓN
                </strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#fde68a' }}>
                  Tu pago está en proceso de verificación (por ejemplo pago en OXXO o transferencia SPEI). Tan pronto se acredite, tu pedido pasará a producción automáticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPagoStatus(null)}
                style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#fcd34d', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Cerrar Aviso ✕
              </button>
            </div>
          )}

          {pagoStatus === 'fallo' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  ⚠️ EL PAGO NO PUDO COMPLETARSE
                </strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#fecaca' }}>
                  El pago fue cancelado o rechazado por tu banco en Mercado Pago. Puedes intentar de nuevo o elegir transferencia directa BBVA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPagoStatus(null)}
                style={{ background: 'transparent', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Cerrar Aviso ✕
              </button>
            </div>
          )}
          {loading && productos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem', color: '#a1a1aa' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid rgba(238,223,198,0.2)', borderTopColor: '#eedfc6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span className="font-bronco" style={{ fontSize: '1rem', letterSpacing: '0.1em', color: '#eedfc6', fontFamily: "'Bronco', 'BroncoPersonalUse', serif" }}>Cargando catálogo mayorista...</span>
            </div>
          ) : productos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem', color: '#71717a', background: '#131313', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              No hay productos disponibles en este momento.
            </div>
          ) : (
            <div className="products-grid-5">
              {productos.map((prod) => {
                const orderItem = orderItems[prod.id];
                const isSelected = orderItem && orderItem.cantidad > 0;
                
                return (
                  <div key={prod.id} style={{ 
                    background: '#131313',
                    border: isSelected ? '1px solid #eedfc6' : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isSelected ? '0 0 20px rgba(238, 223, 198, 0.15)' : '0 8px 24px rgba(0,0,0,0.4)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden'
                  }}>
                    {/* Image 1:1 Container */}
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#181818', position: 'relative', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={getImageUrl(prod)}
                        alt={prod.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                      />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#eedfc6', color: '#0b0b0b', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                          SELECCIONADO ({orderItem.cantidad})
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.15rem 1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '0.4rem' }}>
                        <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.15rem', letterSpacing: '0.03em', color: '#ffffff', fontFamily: "'Bronco', 'BroncoPersonalUse', serif", textTransform: 'uppercase' }}>
                          {prod.nombre}
                        </h3>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {orderItem && orderItem.cantidad > 0 && getDiscountedPrice(prod, orderItem.cantidad) < prod.precio_base ? (
                             <>
                               <span style={{ fontSize: '0.8rem', color: '#71717a', textDecoration: 'line-through', marginRight: '0.3rem' }}>${prod.precio_base}</span>
                               <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#eedfc6' }}>${getDiscountedPrice(prod, orderItem.cantidad)}</span>
                             </>
                          ) : (
                             <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#eedfc6' }}>${prod.precio_base}</span>
                          )}
                        </div>
                      </div>
                      
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#a1a1aa', minHeight: '36px', lineHeight: 1.35 }}>
                        {prod.mini_descripcion}
                      </p>
                    
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.06)', padding: '0.5rem 0.7rem', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 500 }}>Cantidad:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button onClick={() => handleQuantityChange(prod.id, -1)} style={{ width: 28, height: 28, borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>-</button>
                          <input 
                            type="number"
                            min="0"
                            value={orderItem?.cantidad || 0}
                            onChange={(e) => handleManualQuantity(prod.id, e.target.value)}
                            style={{ width: '40px', textAlign: 'center', background: '#141414', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#eedfc6', padding: '0.2rem', fontSize: '0.9rem', fontWeight: 700 }}
                          />
                          <button onClick={() => handleQuantityChange(prod.id, 1)} style={{ width: 28, height: 28, borderRadius: '6px', background: '#eedfc6', border: 'none', color: '#0b0b0b', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>+</button>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                          {prod.nombre.includes('Base Agua') && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Color de la Cera
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {WATER_BASED_WAXES.map(colorPreset => (
                                  <button
                                    key={colorPreset.name}
                                    onClick={() => setOrderItems(prev => ({ ...prev, [prod.id]: { ...prev[prod.id], color: colorPreset.name } }))}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.3rem 0.55rem',
                                      background: orderItem?.color === colorPreset.name ? 'rgba(238, 223, 198, 0.15)' : '#141414',
                                      border: orderItem?.color === colorPreset.name ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      fontSize: '0.72rem',
                                      color: orderItem?.color === colorPreset.name ? '#eedfc6' : '#a1a1aa'
                                    }}
                                  >
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorPreset.color, boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
                                    {colorPreset.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {prod.nombre.includes('Mate') && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Color de la Cera
                              </p>
                              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff' }} />
                                Blanco (Fórmula estándar mate)
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: '0.8rem', marginBottom: '0.6rem' }}>
                            <label style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.75rem', 
                              cursor: 'pointer', 
                              background: orderItem?.hasCustomDesign ? 'rgba(238, 223, 198, 0.12)' : '#141414', 
                              padding: '0.75rem 0.85rem', 
                              borderRadius: '8px', 
                              border: orderItem?.hasCustomDesign ? '1px solid #eedfc6' : '1px solid rgba(255,255,255,0.08)', 
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}>
                              <input 
                                type="checkbox" 
                                checked={Boolean(orderItem?.hasCustomDesign)}
                                onChange={(e) => setOrderItems(prev => ({ 
                                  ...prev, 
                                  [prod.id]: { ...prev[prod.id], hasCustomDesign: e.target.checked } 
                                }))}
                                style={{ accentColor: '#eedfc6', width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>Diseño personalizado</span>
                                  <span style={{ fontSize: '0.85rem', color: '#eedfc6', fontWeight: 800 }}>+$150 MXN</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#a1a1aa', marginTop: '0.15rem' }}>
                                  Preparación y adaptación gráfica de la etiqueta de este producto
                                </span>
                              </div>
                            </label>
                          </div>

                          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#a1a1aa' }}>
                            <span>Subtotal ({orderItem?.cantidad || 0} uds):</span>
                            <span style={{ color: '#eedfc6', fontWeight: 700, fontSize: '0.95rem' }}>
                              ${(((orderItem?.cantidad || 0) * getDiscountedPrice(prod, orderItem?.cantidad || 0)) + (orderItem?.hasCustomDesign ? 150 : 0)).toLocaleString()} MXN
                            </span>
                          </div>

                          <button 
                            onClick={() => handleAddToCart(prod.id)}
                            className="font-bronco"
                            style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem', background: '#eedfc6', color: '#0b0b0b', fontWeight: 800, borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.95rem', letterSpacing: '0.04em', boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)', transition: 'all 0.2s', fontFamily: "'Bronco', 'BroncoPersonalUse', serif", textTransform: 'uppercase' }}
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
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(18, 18, 18, 0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.12)', padding: '1rem 2rem', zIndex: 40, boxShadow: '0 -10px 40px rgba(0,0,0,0.8)' }}>
            
            <div className="desktop-cart-list" style={{ marginBottom: '1rem' }}>
              {cart.map((item) => (
                <div key={item.cartItemId} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.8rem 1rem', minWidth: '240px', display: 'flex', flexDirection: 'column' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                     <span className="font-bronco" style={{ fontSize: '0.95rem', letterSpacing: '0.03em', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff', fontFamily: "'Bronco', 'BroncoPersonalUse', serif" }}>{item.producto.nombre}</span>
                     <button onClick={() => handleRemoveFromCart(item.cartItemId)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>✕</button>
                   </div>
                   <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                     Cant: {item.cantidad} 
                     {item.producto.nombre.includes('Base Agua') && ` | Color: ${item.color || WATER_BASED_WAXES[0].name}`}
                     {item.hasCustomDesign && ' | Diseño personalizado (+$150)'}
                   </span>
                   <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#eedfc6', marginTop: '0.4rem' }}>
                     ${((item.cantidad * getDiscountedPrice(item.producto, item.cantidad)) + (item.hasCustomDesign ? 150 : 0)).toLocaleString()} MXN
                   </span>
                </div>
              ))}
            </div>

            <div style={{ maxWidth: '1680px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Resumen del pedido</span>
                <span className="font-bronco" style={{ fontSize: '1.4rem', color: '#ffffff', letterSpacing: '0.04em', fontFamily: "'Bronco', 'BroncoPersonalUse', serif" }}>
                  {totalItems} UNIDADES <span style={{ color: '#eedfc6', marginLeft: '0.8rem' }}>${totalPrice.toLocaleString()} MXN</span>
                </span>
              </div>
              <button 
                onClick={() => setShowCheckout(true)}
                className="font-bronco"
                style={{ padding: '0.9rem 2.2rem', background: '#eedfc6', color: '#0b0b0b', fontWeight: 800, borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', letterSpacing: '0.04em', boxShadow: '0 4px 20px rgba(238, 223, 198, 0.3)', fontFamily: "'Bronco', 'BroncoPersonalUse', serif" }}
              >
                Proceder al Pago <Check size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {showCheckout && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#141414', color: '#ffffff', padding: '2.5rem', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.12)', width: '100%', maxWidth: '520px', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)', maxHeight: '90vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
                    Confirmación
                  </span>
                  <h2 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                    RESUMEN DE TU PEDIDO
                  </h2>
                </div>
                <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}>✕</button>
              </div>

              {hasCustomDesign && (
                <div style={{ background: 'rgba(238, 223, 198, 0.08)', border: '1px solid rgba(238, 223, 198, 0.3)', color: '#eedfc6', padding: '0.9rem 1.1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  💡 <strong>Diseño personalizado incluido:</strong> Has seleccionado diseño personalizado (+$150 MXN por producto). Una vez confirmado tu pedido, nuestro equipo se comunicará contigo vía WhatsApp o correo para acordar el diseño de tus etiquetas.
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                {cart.map(item => (
                  <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1c1c1c', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div>
                       <p className="font-bronco" style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: '#ffffff', letterSpacing: '0.03em' }}>{item.producto.nombre}</p>
                       <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>
                         Cant: {item.cantidad} 
                         {(item.producto.nombre.includes('Base Agua') || item.producto.nombre.includes('Mate')) && (
                           <> | Color: {item.producto.nombre.includes('Base Agua') ? (item.color || WATER_BASED_WAXES[0].name) : 'Blanco'}</>
                         )}
                         {item.hasCustomDesign && (
                           <span style={{ color: '#eedfc6', fontWeight: 600 }}> | Diseño personalizado (+$150 MXN)</span>
                         )}
                       </p>
                     </div>
                     <div style={{ fontWeight: 800, color: '#eedfc6', fontSize: '1rem' }}>
                       ${((item.cantidad * getDiscountedPrice(item.producto, item.cantidad)) + (item.hasCustomDesign ? 150 : 0)).toLocaleString()}
                     </div>
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0 0.4rem 0', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Subtotal productos ({totalItems} unidades)</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>${totalProductsPrice.toLocaleString()} MXN</span>
                </div>

                {totalCustomDesignCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
                    <span style={{ color: '#eedfc6', fontSize: '0.9rem' }}>Diseño personalizado:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#eedfc6' }}>+${totalCustomDesignCost.toLocaleString()} MXN</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Envío {isLocalShipping ? '(Local)' : '(Nacional)'}:</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>${baseShippingCost.toLocaleString()} MXN</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>IVA (16%)</span>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#a1a1aa' }}>${ivaAmount.toLocaleString()} MXN</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="font-bronco" style={{ fontSize: '1.2rem', color: '#ffffff' }}>TOTAL A PAGAR</span>
                  <span className="font-bronco" style={{ fontSize: '1.4rem', color: '#eedfc6' }}>${finalTotal.toLocaleString()} MXN</span>
                </div>
              </div>

              <h3 className="font-bronco" style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                Datos de Envío y Contacto
              </h3>
              <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
                  <input 
                    type="email" 
                    required 
                    value={customerEmail} 
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="juan@ejemplo.com"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono / WhatsApp</label>
                  <input 
                    type="tel" 
                    required 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="Ej. 55 1234 5678"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calle y Número</label>
                  <input 
                    type="text" 
                    required 
                    value={customerStreet} 
                    onChange={e => setCustomerStreet(e.target.value)}
                    placeholder="Ej. Av. Hidalgo 123"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciudad</label>
                    <input 
                      type="text" 
                      list="ciudades-locales"
                      required 
                      value={customerCity} 
                      onChange={e => setCustomerCity(e.target.value)}
                      placeholder="Ej. Tampico"
                      style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
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
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</label>
                    <input 
                      type="text" 
                      required 
                      disabled={isLocalShipping}
                      value={customerState} 
                      onChange={e => setCustomerState(e.target.value)}
                      placeholder="Ej. Tamaulipas"
                      style={{ width: '100%', padding: '0.8rem 1rem', background: isLocalShipping ? '#252525' : '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', opacity: isLocalShipping ? 0.7 : 1, outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Código Postal</label>
                  <input 
                    type="text" 
                    required 
                    value={customerZip} 
                    onChange={e => setCustomerZip(e.target.value)}
                    placeholder="Ej. 89000"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                {/* Selección de Método de Pago */}
                <div style={{ marginTop: '1.25rem', background: '#181818', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(238, 223, 198, 0.2)' }}>
                  <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.75rem', color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                    Selecciona tu Método de Pago
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {/* Opción 1: Mercado Pago */}
                    <label 
                      onClick={() => setPaymentMethod('mercadopago')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: paymentMethod === 'mercadopago' ? 'rgba(0, 158, 227, 0.12)' : '#121212',
                        border: `1px solid ${paymentMethod === 'mercadopago' ? '#009EE3' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="mercadopago"
                        checked={paymentMethod === 'mercadopago'}
                        onChange={() => setPaymentMethod('mercadopago')}
                        style={{ accentColor: '#009EE3', width: 17, height: 17 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>💳</span> Pago en Línea (Mercado Pago)
                          <span style={{ fontSize: '0.65rem', background: '#009EE3', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>Recomendado</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '2px' }}>
                          Tarjetas de Crédito/Débito, SPEI, OXXO y Saldo Mercado Pago
                        </div>
                      </div>
                    </label>

                    {/* Opción 2: Transferencia Directa BBVA */}
                    <label 
                      onClick={() => setPaymentMethod('transferencia')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: paymentMethod === 'transferencia' ? 'rgba(238, 223, 198, 0.1)' : '#121212',
                        border: `1px solid ${paymentMethod === 'transferencia' ? '#eedfc6' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="transferencia"
                        checked={paymentMethod === 'transferencia'}
                        onChange={() => setPaymentMethod('transferencia')}
                        style={{ accentColor: '#eedfc6', width: 17, height: 17 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>🏦</span> Transferencia Bancaria Manual (BBVA o Afirme)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '2px' }}>
                          Transferencia directa vía CLABE o cuenta bancaria
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setShowCheckout(false)} style={{ flex: 1, padding: '0.9rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="font-bronco" style={{ flex: 1.4, padding: '0.9rem', background: '#eedfc6', border: 'none', color: '#0b0b0b', fontWeight: 800, borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontSize: '1rem', letterSpacing: '0.03em' }}>
                    {isSubmitting ? 'Procesando...' : (paymentMethod === 'mercadopago' ? 'Confirmar y Pagar en Línea' : 'Confirmar Pedido')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {orderSuccess && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: '#141414', color: '#ffffff', padding: '2.5rem 2rem', borderRadius: '18px', border: '1px solid rgba(238, 223, 198, 0.4)', width: '100%', maxWidth: '520px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(238, 223, 198, 0.12)', border: '1px solid rgba(238, 223, 198, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <Check size={32} color="#eedfc6" />
              </div>
              <h2 className="font-bronco" style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#eedfc6', letterSpacing: '0.04em' }}>
                ¡PEDIDO REGISTRADO CON ÉXITO!
              </h2>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#a1a1aa' }}>
                Hemos guardado tu orden y te enviamos la confirmación a <strong>{customerEmail}</strong>.
              </p>

              {/* Botón Principal: Pagar con Mercado Pago */}
              {mercadoPagoUrl && (
                <div style={{ background: 'rgba(0, 158, 227, 0.08)', border: '1px solid rgba(0, 158, 227, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#009EE3', fontWeight: 800, marginBottom: '0.6rem' }}>
                    PAGO EN LÍNEA INMEDIATO (MERCADO PAGO)
                  </div>
                  <a
                    href={mercadoPagoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '1.1rem',
                      background: 'linear-gradient(135deg, #009EE3 0%, #007EB5 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      boxShadow: '0 6px 25px rgba(0, 158, 227, 0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    💳 Pagar Ahora con Mercado Pago (${finalTotal.toLocaleString()} MXN) →
                  </a>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.6rem' }}>
                    Tarjetas de Crédito, Débito, Transferencia SPEI, OXXO y Saldo MP
                  </span>
                </div>
              )}

              {/* Datos de Transferencia Directa BBVA y AFIRME */}
              <div style={{ background: '#1c1c1c', padding: '1.2rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#eedfc6', fontWeight: 800 }}>
                  {mercadoPagoUrl ? 'O si prefieres transferencia bancaria directa:' : 'Datos para transferencia bancaria directa:'}
                </div>
                
                <div style={{ background: '#141414', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>BANCO BBVA</div>
                  <div><strong style={{ color: '#eedfc6' }}>Titular:</strong> OMAR CHAVEZ</div>
                  <div><strong style={{ color: '#eedfc6' }}>Teléfono:</strong> 833 453 9727</div>
                  <div><strong style={{ color: '#eedfc6' }}>CLABE:</strong> 012 180 01536760721 4</div>
                  <div><strong style={{ color: '#eedfc6' }}>Tarjeta:</strong> 4152 3144 0280 6635</div>
                </div>

                <div style={{ background: '#141414', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>BANCO AFIRME</div>
                  <div><strong style={{ color: '#eedfc6' }}>Titular:</strong> OMAR CHAVEZ</div>
                  <div><strong style={{ color: '#eedfc6' }}>Cuenta:</strong> 852340789</div>
                  <div><strong style={{ color: '#eedfc6' }}>CLABE:</strong> 062580008523407899</div>
                </div>
              </div>

              <button onClick={() => { setOrderSuccess(false); window.location.href = '/order/'; }} className="font-bronco" style={{ padding: '0.9rem 2rem', background: '#eedfc6', border: 'none', color: '#0b0b0b', fontWeight: 800, borderRadius: '8px', cursor: 'pointer', width: '100%', fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                Cerrar y Volver a la Tienda
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
