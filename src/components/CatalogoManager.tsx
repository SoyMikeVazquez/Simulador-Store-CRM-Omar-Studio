'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Trash2, Edit2, ChevronLeft, Upload, Check, Search, X } from 'lucide-react';
import styles from './CatalogoManager.module.css';

interface DescuentoVolumen {
  cantidad: number | null;
  porcentaje: number | null;
}

export interface Producto {
  id: string;
  nombre: string;
  precio_base: number;
  mini_descripcion: string;
  descuentos_por_volumen: DescuentoVolumen[] | null;
  imagen_producto?: string;
}

interface CatalogoManagerProps {
  onSelectProduct?: (prod: Producto) => void;
}

export function CatalogoManager({ onSelectProduct }: CatalogoManagerProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [precioBase, setPrecioBase] = useState<number | ''>('');
  const [miniDesc, setMiniDesc] = useState('');
  const [descuentos, setDescuentos] = useState<DescuentoVolumen[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('productos_mayoreo').select('*').order('created_at', { ascending: false });
    if (data) {
      setProductos(data);
    }
    setLoading(false);
  };

  const handleEditClick = (prod: Producto) => {
    setEditingProdId(prod.id);
    setNombre(prod.nombre);
    setPrecioBase(prod.precio_base);
    setMiniDesc(prod.mini_descripcion || '');
    setDescuentos(prod.descuentos_por_volumen || []);
    setImagenFile(null);
    setImagenPreview(prod.imagen_producto || null);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingProdId(null);
    setNombre('');
    setPrecioBase('');
    setMiniDesc('');
    setDescuentos([]);
    setImagenFile(null);
    setImagenPreview(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagenFile(file);
      setImagenPreview(URL.createObjectURL(file));
    }
  };

  const addDescuento = () => {
    setDescuentos([...descuentos, { cantidad: null, porcentaje: null }]);
  };

  const updateDescuento = (index: number, field: keyof DescuentoVolumen, value: string) => {
    const newDesc = [...descuentos];
    newDesc[index][field] = value === '' ? null : Number(value);
    setDescuentos(newDesc);
  };

  const removeDescuento = (index: number) => {
    setDescuentos(descuentos.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      await supabase.from('productos_mayoreo').delete().eq('id', id);
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación
    for (let i = 0; i < descuentos.length; i++) {
      if (descuentos[i].cantidad === null || descuentos[i].porcentaje === null) {
        alert('Por favor llena todos los campos de descuento.');
        return;
      }
    }

    setIsSaving(true);
    try {
      let imageUrl = imagenPreview; // Mantener la URL existente si no hay archivo nuevo
      
      if (imagenFile) {
        const safeFileName = imagenFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `producto_presentacion_${Date.now()}_${safeFileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('eriquetas')
          .upload(fileName, imagenFile, { cacheControl: '3600', upsert: false });
          
        if (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          alert('Hubo un error subiendo la imagen, pero intentaremos guardar el producto.');
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage.from('eriquetas').getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      const dataToSave = {
        nombre,
        precio_base: Number(precioBase) || 0,
        mini_descripcion: miniDesc,
        descuentos_por_volumen: descuentos,
        imagen_producto: imageUrl && imageUrl.startsWith('blob:') ? null : imageUrl
      };

      if (editingProdId) {
        const { error } = await supabase.from('productos_mayoreo').update(dataToSave).eq('id', editingProdId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('productos_mayoreo').insert([dataToSave]);
        if (error) throw error;
      }
      
      await fetchProductos();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error al guardar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProductos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return productos;
    return productos.filter(p => {
      const nameMatch = (p.nombre || '').toLowerCase().includes(q);
      const descMatch = (p.mini_descripcion || '').toLowerCase().includes(q);
      return nameMatch || descMatch;
    });
  }, [productos, searchQuery]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', minHeight: onSelectProduct ? '260px' : '60vh' }}>
        <Loader2 size={32} className="animate-spin" color="#eedfc6" />
      </div>
    );
  }

  return (
    <div className={styles.container} style={onSelectProduct ? { minHeight: 'auto', padding: '0.5rem 0.25rem', background: 'transparent' } : undefined}>
      
      {/* Buscador de Productos Mayoristas */}
      <div style={{ marginBottom: '1.25rem', position: 'relative', width: '100%', maxWidth: onSelectProduct ? '100%' : '850px', margin: onSelectProduct ? '0 0 1.25rem 0' : '0 auto 1.5rem auto' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#eedfc6', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto por nombre o descripción..."
          style={{
            width: '100%',
            padding: '0.85rem 2.5rem 0.85rem 2.6rem',
            background: '#161616',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '0.9rem',
            outline: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.target.style.borderColor = '#eedfc6'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.productList}>
        {filteredProductos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#141414', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#a1a1aa' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              {searchQuery ? `No se encontraron productos con "${searchQuery}"` : 'No hay productos disponibles en el catálogo.'}
            </p>
          </div>
        ) : (
          filteredProductos.map(prod => (
            <div key={prod.id} className={styles.productCard}>
              <div 
                className={styles.productInfo} 
                onClick={() => onSelectProduct && onSelectProduct(prod)}
                style={{ cursor: onSelectProduct ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <h3 className={styles.productTitle}>{prod.nombre}</h3>
                  {onSelectProduct && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(238, 223, 198, 0.1)', color: '#eedfc6', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(238, 223, 198, 0.25)', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      + Agregar
                    </span>
                  )}
                </div>
                <p className={styles.productDetail}>Precio Base: ${(prod.precio_base || 0).toFixed(2)}</p>
                <p className={styles.productDetailLight}>{prod.mini_descripcion}</p>
                {prod.descuentos_por_volumen && prod.descuentos_por_volumen.length > 0 && (
                  <p className={styles.productDetailLight} style={{ marginTop: '0.25rem', color: '#71717a' }}>
                    Niveles de descuento: {prod.descuentos_por_volumen.length}
                  </p>
                )}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.iconBtn} onClick={() => handleEditClick(prod)} title="Editar producto">
                  <Edit2 size={16} className={styles.editIcon} />
                </button>
                <button className={styles.iconBtn} onClick={() => handleDelete(prod.id)} title="Eliminar producto">
                  <Trash2 size={16} className={styles.deleteIcon} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button className={styles.fab} onClick={handleCreateClick} title="Crear nuevo producto mayorista">
        <Plus size={28} />
      </button>

      {/* Modal / Pantalla de Edición */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            <div className={styles.modalHeader}>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <ChevronLeft size={24} />
              </button>
              <h3>{editingProdId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleSave}>
                <h4 className={styles.sectionTitle}>Información Básica</h4>
                
                <div className={styles.inputGroup}>
                  <span className={styles.floatingLabel}>Imagen de Presentación</span>
                  {!imagenPreview ? (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', border: '1px dashed rgba(238, 223, 198, 0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#161616', marginTop: '0.5rem' }}>
                      <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                      <Upload size={20} style={{ color: '#eedfc6', marginBottom: '0.5rem' }} />
                      <span style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: 500 }}>Subir imagen (1:1 Recomendado)</span>
                    </label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(238, 223, 198, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(238, 223, 198, 0.3)', marginTop: '0.5rem' }}>
                      <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', backgroundImage: `url(${imagenPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.5rem', padding: '0 0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: '#eedfc6', fontWeight: 600 }}>
                          <Check size={14} /> Imagen Lista
                        </span>
                        <label style={{ color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}>
                          Cambiar
                          <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.floatingLabel}>Nombre del Producto</span>
                  <input 
                    type="text" 
                    required 
                    className={styles.input} 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.floatingLabel}>Precio Base ($)</span>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required 
                    className={styles.input} 
                    value={precioBase}
                    onChange={(e) => setPrecioBase(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <span className={styles.floatingLabel}>Mini Descripción (Opcional)</span>
                  <textarea 
                    className={styles.input} 
                    rows={3}
                    style={{ resize: 'none' }}
                    value={miniDesc}
                    onChange={(e) => setMiniDesc(e.target.value)}
                  />
                </div>

                <div className={styles.sectionTitle} style={{ marginTop: '2rem' }}>
                  Descuentos por Volumen
                  <button type="button" className={styles.addDiscountBtn} onClick={addDescuento}>
                    <Plus size={18} /> Agregar
                  </button>
                </div>

                {descuentos.length === 0 ? (
                  <p className={styles.emptyDiscounts}>
                    No hay niveles de descuento configurados. Se cobrará precio base siempre.
                  </p>
                ) : (
                  descuentos.map((desc, idx) => (
                    <div key={idx} className={styles.discountRow}>
                      <div className={styles.discountInputWrapper}>
                        <span className={styles.floatingLabel}>Cantidad Mínima</span>
                        <input 
                          type="number" 
                          min="1"
                          required
                          className={styles.input}
                          value={desc.cantidad || ''}
                          onChange={(e) => updateDescuento(idx, 'cantidad', e.target.value)}
                        />
                      </div>
                      <div className={styles.discountInputWrapper}>
                        <span className={styles.floatingLabel}>% de Descuento</span>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          required
                          className={styles.input}
                          value={desc.porcentaje || ''}
                          onChange={(e) => updateDescuento(idx, 'porcentaje', e.target.value)}
                        />
                      </div>
                      <button type="button" className={styles.removeDiscountBtn} onClick={() => removeDescuento(idx)}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}

                <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
