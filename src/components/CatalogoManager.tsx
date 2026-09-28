'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Trash2, Edit2, ChevronLeft, Upload, Check } from 'lucide-react';
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

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <Loader2 size={32} className="animate-spin" color="#18181b" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.productList}>
        {productos.map(prod => (
          <div key={prod.id} className={styles.productCard}>
            <div 
              className={styles.productInfo} 
              onClick={() => onSelectProduct && onSelectProduct(prod)}
              style={{ cursor: onSelectProduct ? 'pointer' : 'default' }}
            >
              <h3 className={styles.productTitle}>{prod.nombre}</h3>
              <p className={styles.productDetail}>Precio Base: ${(prod.precio_base || 0).toFixed(2)}</p>
              <p className={styles.productDetail}>Desc: {prod.mini_descripcion}</p>
              {prod.descuentos_por_volumen && prod.descuentos_por_volumen.length > 0 && (
                <p className={styles.productDetailLight}>
                  Niveles de descuento: {prod.descuentos_por_volumen.length}
                </p>
              )}
            </div>
            <div className={styles.cardActions}>
              <button className={styles.iconBtn} onClick={() => handleEditClick(prod)}>
                <Edit2 size={18} className={styles.editIcon} />
              </button>
              <button className={styles.iconBtn} onClick={() => handleDelete(prod.id)}>
                <Trash2 size={18} className={styles.deleteIcon} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.fab} onClick={handleCreateClick}>
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
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff', marginTop: '0.5rem' }}>
                      <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                      <Upload size={20} style={{ color: '#52525b', marginBottom: '0.5rem' }} />
                      <span style={{ fontSize: '0.85rem', color: '#52525b', fontWeight: 500 }}>Subir imagen (1:1 Recomendado)</span>
                    </label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)', marginTop: '0.5rem' }}>
                      <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', backgroundImage: `url(${imagenPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(0,0,0,0.1)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.5rem', padding: '0 0.5rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
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
