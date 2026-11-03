'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Loader2, StickyNote, Calendar, FileText } from 'lucide-react';

interface Nota {
  id: string;
  titulo: string;
  contenido: string;
  color: string;
  created_at: string;
}

const COLORS = ['#fef3c7', '#d1fae5', '#dbeafe', '#fce7f3', '#f3e8ff', '#e2e8f0'];

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotas();
  }, []);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('notas_generales').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setNotas(data || []);
    } catch (error) {
      console.warn('Tabla notas_generales no disponible, usando localStorage.');
      const local = localStorage.getItem('omar_notas_generales');
      if (local) {
        setNotas(JSON.parse(local));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLocal = (newNotas: Nota[]) => {
    localStorage.setItem('omar_notas_generales', JSON.stringify(newNotas));
    setNotas(newNotas);
  };

  const handleAddNota = async () => {
    const nuevaNota: Nota = {
      id: Math.random().toString(36).substring(2, 11),
      titulo: 'Nueva Nota',
      contenido: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      created_at: new Date().toISOString()
    };

    const newNotas = [nuevaNota, ...notas];

    try {
      const { error } = await supabase.from('notas_generales').insert([nuevaNota]);
      if (error) throw error;
      setNotas(newNotas);
    } catch (e) {
      saveToLocal(newNotas);
    }
  };

  const handleUpdateNota = async (id: string, campo: 'titulo' | 'contenido' | 'color', valor: string) => {
    const updated = notas.map(n => n.id === id ? { ...n, [campo]: valor } : n);
    setNotas(updated);

    setSavingId(id);
    try {
      const { error } = await supabase.from('notas_generales').update({ [campo]: valor }).eq('id', id);
      if (error) throw error;
    } catch (e) {
      localStorage.setItem('omar_notas_generales', JSON.stringify(updated));
    } finally {
      setTimeout(() => setSavingId(null), 500);
    }
  };

  const handleDeleteNota = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta nota?')) return;
    
    const filtered = notas.filter(n => n.id !== id);
    
    try {
      const { error } = await supabase.from('notas_generales').delete().eq('id', id);
      if (error) throw error;
      setNotas(filtered);
    } catch (e) {
      saveToLocal(filtered);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" color="#eedfc6" />
        <span className="font-bronco" style={{ color: '#eedfc6', letterSpacing: '0.1em' }}>Cargando Notas...</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', background: '#0b0b0b', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#141414', padding: '1.2rem 1.5rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'rgba(238, 223, 198, 0.1)', padding: '0.6rem', borderRadius: '8px', color: '#eedfc6' }}>
            <StickyNote size={20} />
          </div>
          <div>
            <h2 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.04em', color: '#ffffff' }}>Bloc de Notas</h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>Apunta ideas, recordatorios y tareas pendientes del taller.</p>
          </div>
        </div>
        
        <button 
          onClick={handleAddNota}
          className="font-bronco"
          style={{ background: '#eedfc6', color: '#0b0b0b', border: 'none', padding: '0.7rem 1.3rem', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', letterSpacing: '0.04em', boxShadow: '0 4px 15px rgba(238, 223, 198, 0.25)' }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={18} /> Nueva Nota
        </button>
      </div>

      {/* Grid de Notas */}
      {notas.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', gap: '1rem', marginTop: '3rem' }}>
          <FileText size={48} strokeWidth={1} />
          <p style={{ margin: 0, fontSize: '1.1rem' }}>Aún no hay notas. ¡Crea la primera!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {notas.map(nota => (
            <div 
              key={nota.id} 
              style={{ 
                background: nota.color, 
                borderRadius: '12px', 
                padding: '1.2rem', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.4)',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={nota.titulo}
                  onChange={(e) => handleUpdateNota(nota.id, 'titulo', e.target.value)}
                  placeholder="Título..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: '#18181b',
                    outline: 'none',
                    width: '100%',
                    marginRight: '1rem'
                  }}
                />
                <button 
                  onClick={() => handleDeleteNota(nota.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', opacity: 0.7, transition: 'opacity 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = '1'}
                  onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                  title="Eliminar nota"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea
                value={nota.contenido}
                onChange={(e) => handleUpdateNota(nota.id, 'contenido', e.target.value)}
                placeholder="Escribe tu nota aquí..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.9rem',
                  color: '#3f3f46',
                  outline: 'none',
                  minHeight: '120px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#71717a' }}>
                  <Calendar size={12} />
                  {new Date(nota.created_at).toLocaleDateString()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {savingId === nota.id && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Guardado</span>}
                  
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleUpdateNota(nota.id, 'color', c)}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: c,
                          border: nota.color === c ? '2px solid #18181b' : '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
