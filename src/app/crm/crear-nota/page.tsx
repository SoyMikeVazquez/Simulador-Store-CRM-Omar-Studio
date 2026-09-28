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
    <div style={{ flex: 1, padding: '1rem', background: '#f8f9fa', overflowY: 'auto' }}>
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
            <Calendar size={24} color="#0ea5e9" />
            <div>
              <p className={styles.dateTitle}>Fecha y Hora de la Nota</p>
              <p className={styles.dateSubtitle}>{formatDisplayDate(fechaNota)}</p>
            </div>
          </div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1', cursor: 'pointer' }}>
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
              <button type="button" onClick={() => setIsCatalogOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9' }}>
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
            <div className={styles.inputRow}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Descuento Especial General ($)
                </span>
                <input type="number" min="0" step="0.01" className={styles.input} value={descuentoEspecial} onChange={e => setDescuentoEspecial(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Costo de Envío ($)
                </span>
                <input type="number" min="0" step="0.01" className={styles.input} value={envio} onChange={e => setEnvio(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Anticipo / Abono ($)
                </span>
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ background: '#f4f4f5' }}>
            <div className={styles.modalHeader} style={{ background: '#ffffff' }}>
              <h3>Seleccionar Producto</h3>
              <button className={styles.closeBtn} onClick={() => setIsCatalogOpen(false)}>×</button>
            </div>
            <div style={{ padding: '0', flex: 1, overflowY: 'auto', position: 'relative' }}>
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
