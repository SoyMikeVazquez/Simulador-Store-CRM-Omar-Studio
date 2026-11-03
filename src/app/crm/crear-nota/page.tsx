'use client';
import { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateNotaPdf, NotaVentaInfo, NotaItem } from '../../../pdf_generator_logic/generateNotaPdf';
import { supabase } from '@/lib/supabase';
import { Calendar, Package, Plus, Trash2, Box } from 'lucide-react';
import styles from './page.module.css';
import { CatalogoManager } from '@/components/CatalogoManager';

export function CrearNotaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<any[]>([]);

  // Config inicial oculta (se deduce)
  const [folio, setFolio] = useState<number>(1);
  const [fechaNota, setFechaNota] = useState<string>(
    new Date().toISOString().slice(0, 16) // "YYYY-MM-DDThh:mm"
  );

  // Cliente
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteCorreo, setClienteCorreo] = useState('');

  // Adicionales
  const [descuentoEspecial, setDescuentoEspecial] = useState<number | ''>('');
  const [aplicaIva, setAplicaIva] = useState(false);
  const [envio, setEnvio] = useState<number | ''>('');
  const [anticipo, setAnticipo] = useState<number | ''>('');

  // Items
  const [items, setItems] = useState<NotaItem[]>([]);

  useEffect(() => {
    if (editId) {
      fetchNotaParaEditar(editId);
    } else {
      fetchNextFolio();
    }
  }, [editId]);

  const fetchNotaParaEditar = async (id: string) => {
    try {
      const { data, error } = await supabase.from('notas_venta').select('*').eq('id', id).single();
      if (data && !error) {
        setFolio(data.folio);
        setFechaNota(new Date(data.created_at).toISOString().slice(0, 16));
        setClienteNombre(data.cliente_nombre || '');
        setClienteDireccion(data.cliente_direccion || '');
        setClienteTelefono(data.cliente_telefono || '');
        setClienteCorreo(data.cliente_correo || '');
        setDescuentoEspecial(data.descuento_especial || '');
        setAplicaIva(data.aplica_iva || false);
        setEnvio(data.envio || '');
        setAnticipo(data.anticipo || '');
        setItems(typeof data.items === 'string' ? JSON.parse(data.items) : data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNextFolio = async () => {
    try {
      const { data, error } = await supabase
        .from('notas_venta')
        .select('folio')
        .order('folio', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setFolio(data[0].folio + 1);
      } else {
        setFolio(1);
      }
    } catch (e) {
      setFolio(1);
    }
  };

  const addItemFromCatalog = (prod: any) => {
    setItems([...items, { cantidad: 1, nombre: prod.nombre, precio_unitario: prod.precio_base, total: prod.precio_base }]);
    setIsCatalogOpen(false);
  };

  const addCustomItem = () => {
    setItems([...items, { cantidad: 1, nombre: '', precio_unitario: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof NotaItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'nombre') {
      item.nombre = value as string;
    } else {
      const numValue = value === '' ? 0 : Number(value);
      item[field] = numValue as never;
    }

    item.total = (item.cantidad || 0) * (item.precio_unitario || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  // Cálculos
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const descuento = Number(descuentoEspecial) || 0;
  const costoEnvio = Number(envio) || 0;

  const iva = useMemo(() => {
    if (!aplicaIva) return 0;
    const base = Math.max(0, subtotal - descuento);
    return base * 0.16;
  }, [subtotal, descuento, aplicaIva]);

  const totalGeneral = useMemo(() => {
    return Math.max(0, subtotal - descuento) + iva + costoEnvio;
  }, [subtotal, descuento, iva, costoEnvio]);

  const formatDisplayDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(d).toUpperCase();
    } catch {
      return '';
    }
  };

  const handleGeneratePDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Por favor agrega al menos un producto.");
      return;
    }

    setIsGenerating(true);

    const validItems = items.filter(item => item.nombre.trim() !== '');

    const notaData = {
      folio: folio,
      es_recibo: false, // Por defecto siempre es Nota de Venta ahora
      cliente_nombre: clienteNombre,
      cliente_direccion: clienteDireccion,
      cliente_telefono: clienteTelefono,
      cliente_correo: clienteCorreo,
      subtotal,
      descuento_especial: descuento,
      aplica_iva: aplicaIva,
      iva,
      envio: costoEnvio,
      anticipo: Number(anticipo) || 0,
      total: totalGeneral,
      items: validItems,
      finalizada: false,
      created_at: new Date(fechaNota).toISOString()
    };

    try {
      if (editId) {
        const { error } = await supabase
          .from('notas_venta')
          .update(notaData)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notas_venta')
          .insert([notaData]);
        if (error) throw error;
      }

      await generateNotaPdf({
        ...notaData,
        created_at: notaData.created_at
      });

      if (editId) {
        window.location.href = '/crm/historial-notas/';
      } else {
        // Limpiar formulario
        setClienteNombre('');
        setClienteDireccion('');
        setClienteTelefono('');
        setClienteCorreo('');
        setItems([]);
        setDescuentoEspecial('');
        setEnvio('');
        setAnticipo('');
        setAplicaIva(false);
        fetchNextFolio();
        setFechaNota(new Date().toISOString().slice(0, 16));
      }

    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al generar la nota.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', background: '#0b0b0b', overflowY: 'auto' }}>
      <div className={styles.formContainer}>

        <div className={styles.header}>
          <h2 className={styles.title}>{editId ? 'Editar Nota de Venta' : 'Crear Nota de Venta'}</h2>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setIsCatalogOpen(true)}
          type="button"
        >
          <Box size={20} /> Gestionar Catálogo de Mayoreo
        </button>

        <div className={styles.dateBox}>
          <div className={styles.dateBoxLeft}>
            <Calendar size={24} color="#eedfc6" />
            <div>
              <p className={styles.dateTitle}>Fecha y Hora de la Nota</p>
              <p className={styles.dateSubtitle}>{formatDisplayDate(fechaNota)}</p>
            </div>
          </div>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eedfc6', cursor: 'pointer' }}>
            Cambiar
            <input
              type="datetime-local"
              value={fechaNota}
              onChange={e => setFechaNota(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: '0', height: '0' }}
            />
          </label>
        </div>

        <form onSubmit={handleGeneratePDF} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>

          <div>
            <h3 className={styles.sectionTitle}>Datos del Cliente</h3>
            <div className={styles.inputRow}>
              <input type="text" className={styles.input} required placeholder="Nombre del Cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
              <input type="text" className={styles.input} required placeholder="Dirección" value={clienteDireccion} onChange={e => setClienteDireccion(e.target.value)} />
              <input type="tel" className={styles.input} placeholder="Teléfono" value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value.replace(/[^0-9]/g, ''))} />
              <input type="email" className={styles.input} placeholder="Correo Electrónico (Opcional)" value={clienteCorreo} onChange={e => setClienteCorreo(e.target.value)} />
            </div>
          </div>

          <div>
            <h3 className={styles.sectionTitle}>
              Productos & Conceptos
              <button type="button" onClick={() => setIsCatalogOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#eedfc6' }}>
                <Plus size={24} />
              </button>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.length === 0 ? (
                <div className={styles.emptyProducts}>
                  No has agregado productos a esta nota.
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={index} className={styles.productRow}>
                    <input
                      type="number" min="1" required className={styles.input} style={{ width: '70px', padding: '0.8rem' }}
                      value={item.cantidad || ''} onChange={e => handleItemChange(index, 'cantidad', e.target.value)}
                      placeholder="Q"
                    />
                    <input
                      type="text" required className={styles.input} style={{ flex: 1, padding: '0.8rem' }}
                      value={item.nombre} onChange={e => handleItemChange(index, 'nombre', e.target.value)}
                      placeholder="Descripción"
                    />
                    <input
                      type="number" min="0" step="0.01" required className={styles.input} style={{ width: '90px', padding: '0.8rem' }}
                      value={item.precio_unitario === 0 && item.nombre === '' ? '' : item.precio_unitario}
                      onChange={e => handleItemChange(index, 'precio_unitario', e.target.value)}
                      placeholder="$ Precio"
                    />
                    <button type="button" className={styles.removeBtn} onClick={() => removeItem(index)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}

              <button type="button" className={styles.primaryButtonOutline} onClick={addCustomItem} style={{ marginTop: '0.5rem' }}>
                <Plus size={18} /> Agregar Fila Personalizada (Envío, Etiqueta, etc.)
              </button>
            </div>
          </div>

          <div>
            <h3 className={styles.sectionTitle}>Resumen & Descuentos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Descuento Especial ($)
                </label>
                <input type="number" min="0" step="0.01" className={styles.input} value={descuentoEspecial} onChange={e => setDescuentoEspecial(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Costo de Envío ($)
                </label>
                <input type="number" min="0" step="0.01" className={styles.input} value={envio} onChange={e => setEnvio(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Anticipo / Abono ($)
                </label>
                <input type="number" min="0" step="0.01" className={styles.input} value={anticipo} onChange={e => setAnticipo(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <span>Agregar IVA (16%)</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={aplicaIva} onChange={e => setAplicaIva(e.target.checked)} />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {descuento > 0 && (
              <div className={styles.totalRow} style={{ color: '#ef4444' }}>
                <span>Descuento Especial:</span>
                <span>-${descuento.toFixed(2)}</span>
              </div>
            )}
            {aplicaIva && (
              <div className={styles.totalRow}>
                <span>IVA (16%):</span>
                <span>${iva.toFixed(2)}</span>
              </div>
            )}
            {costoEnvio > 0 && (
              <div className={styles.totalRow}>
                <span>Costo de Envío:</span>
                <span>${costoEnvio.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>TOTAL GENERAL:</span>
              <span className={styles.grandTotalValue}>${totalGeneral.toFixed(2)}</span>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isGenerating}>
            {isGenerating ? 'Procesando...' : editId ? 'Actualizar y Generar PDF' : 'Guardar y Generar PDF'}
          </button>
        </form>
      </div>

      {/* Catálogo Modal */}
      {isCatalogOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCatalogOpen(false)}>
          <div 
            className={styles.modalContent} 
            style={{ 
              background: '#121212', 
              maxWidth: '680px', 
              maxHeight: '88vh', 
              border: '1px solid rgba(238, 223, 198, 0.25)', 
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div 
              style={{ 
                background: '#181818', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a1a1aa', fontWeight: 700 }}>
                  Catálogo Mayorista
                </span>
                <h3 style={{ margin: 0, color: '#eedfc6', fontFamily: 'var(--font-bronco), serif', fontSize: '1.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Seleccionar Producto
                </h3>
              </div>
              <button 
                onClick={() => setIsCatalogOpen(false)}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  color: '#ffffff', 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  fontSize: '1.1rem',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', position: 'relative', background: '#0e0e0e' }}>
              <CatalogoManager onSelectProduct={addItemFromCatalog} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrearNotaWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Cargando...</div>}>
      <CrearNotaPage />
    </Suspense>
  );
}
