'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateNotaPdf, NotaVentaInfo } from '../../../pdf_generator_logic/generateNotaPdf';
import styles from './page.module.css';

export default function HistorialNotasPage() {
  const router = useRouter();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterDate, setFilterDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetchNotas();
  }, []);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notas_venta')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setNotas(data);
    } catch (error) {
      console.error('Error fetching notas:', error);
      alert('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (nota: any) => {
    try {
      const { error } = await supabase
        .from('notas_venta')
        .update({ es_recibo: !nota.es_recibo })
        .eq('id', nota.id);
        
      if (error) throw error;
      
      setNotas(prev => prev.map(n => n.id === nota.id ? { ...n, es_recibo: !nota.es_recibo } : n));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al cambiar el estado');
    }
  };

  const downloadPdf = async (nota: any) => {
    const dataForPdf: NotaVentaInfo = {
      ...nota,
      items: typeof nota.items === 'string' ? JSON.parse(nota.items) : nota.items
    };
    try {
      await generateNotaPdf(dataForPdf);
    } catch (err) {
      console.error(err);
      alert('Hubo un problema regenerando el PDF');
    }
  };

  const filteredNotas = useMemo(() => {
    return notas.filter(nota => {
      // Búsqueda por cliente o folio
      const term = search.toLowerCase();
      const matchSearch = nota.cliente_nombre?.toLowerCase().includes(term) || String(nota.folio).includes(term);
      
      // Filtro por fecha (created_at es string ISO)
      let matchDate = true;
      if (filterDate) {
        const notaDate = new Date(nota.created_at).toISOString().split('T')[0];
        matchDate = notaDate === filterDate;
      }
      
      return matchSearch && matchDate;
    });
  }, [notas, search, filterDate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className="badge">Registros</div>
          <h1 className="title">Historial de Notas</h1>
          <p className="subtitle">Visualiza, filtra y re-imprime tus notas de venta o recibos generados.</p>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Buscar:</label>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="Cliente o Folio..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Fecha:</label>
          <input 
            type="date" 
            className={styles.input} 
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <button 
            className="secondaryBtn" 
            style={{ padding: '0.4rem 1rem', borderRadius: '8px' }}
            onClick={() => {setSearch(''); setFilterDate('');}}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className="loadingOverlay" style={{ position: 'relative', height: '300px', background: 'transparent' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--accent-gold)' }}>Cargando historial...</p>
          </div>
        ) : filteredNotas.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No se encontraron notas</h3>
            <p>Genera una nueva nota en el módulo de Crear Nota para verla aquí.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotas.map(nota => (
                <tr key={nota.id}>
                  <td><strong>#{String(nota.folio).padStart(4, '0')}</strong></td>
                  <td>{nota.es_recibo ? 'Recibo / Finalizada' : 'Presupuesto'}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>{nota.cliente_nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{nota.cliente_telefono}</div>
                  </td>
                  <td style={{ color: '#a1a1aa' }}>
                    {new Intl.DateTimeFormat('es-MX', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }).format(new Date(nota.created_at))}
                  </td>
                  <td style={{ color: '#eedfc6', fontWeight: 800 }}>
                    ${(nota.total || 0).toFixed(2)}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${nota.finalizada ? styles.badgeFinalizada : styles.badgePendiente}`}>
                      {nota.finalizada ? 'Finalizada' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => window.location.href = `/crm/crear-nota/?id=${nota.id}`}
                        style={{ color: '#0ea5e9' }}
                      >
                        Editar
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => toggleStatus(nota)}
                        style={{ color: nota.es_recibo ? '#f59e0b' : '#10b981' }}
                      >
                        {nota.es_recibo ? 'Revertir a Presupuesto' : 'Convertir a Recibo'}
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => downloadPdf(nota)}
                        title="Descargar PDF"
                      >
                        Descargar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
