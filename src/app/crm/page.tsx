'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, X } from 'lucide-react';

interface Articulo {
  cantidad: number;
  nombre: string;
  precio_unitario: number;
  total: number;
}

interface KanbanCard {
  id: string;
  cliente: string;
  email: string;
  telefono?: string;
  direccion?: string;
  monto: number;
  estado: 'prospecto' | 'carrito' | 'pendiente' | 'comprado' | 'pagado' | 'entregado';
  geographicState?: string;
  fecha: string;
  rawDate?: Date | null;
  articulos?: Articulo[];
  requiere_factura?: boolean;
  iva?: number;
  archivos?: Record<string, string> | null;
  notas?: string;
}

export default function CrmPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [prospectCards, setProspectCards] = useState<KanbanCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [notaActual, setNotaActual] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  useEffect(() => {
    if (selectedCard) {
      setNotaActual(selectedCard.notas || '');
    }
  }, [selectedCard]);

  // Filtros de fecha (Por defecto: Últimos 5 días)
  const [filterPreset, setFilterPreset] = useState<'5days' | '30days' | 'all' | 'custom'>('5days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchPedidos = async () => {
    setRefreshing(true);
    // 1. Pedidos (Intenta primero con created_at, si falla consulta sin ordenamiento)
    let pedidosData = null;
    let pedidosRes = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    
    if (pedidosRes.error) {
      console.warn("created_at no existe en pedidos, consultando sin orden:", pedidosRes.error.message);
      // Fallback sin .order('created_at')
      const fallbackRes = await supabase.from('pedidos').select('*');
      pedidosData = fallbackRes.data;
    } else {
      pedidosData = pedidosRes.data;
    }

    if (pedidosData) {
      const mapped = pedidosData.map((d: any) => ({
        id: d.id || Math.random().toString(),
        cliente: d.cliente_nombre || 'Cliente',
        email: d.cliente_email || 'Sin correo',
        telefono: d.telefono || 'No especificado',
        direccion: d.direccion || 'No especificada',
        monto: d.monto_total || 0,
        estado: d.status || (['prospecto', 'carrito', 'pendiente', 'comprado', 'pagado', 'entregado'].includes(d.estado) ? d.estado : 'pendiente'),
        geographicState: d.estado && !['prospecto', 'carrito', 'pendiente', 'comprado', 'pagado', 'entregado'].includes(d.estado) ? d.estado : '',
        fecha: d.created_at ? new Date(d.created_at).toLocaleString() : 'Reciente',
        rawDate: d.created_at ? new Date(d.created_at) : null,
        articulos: d.articulos || [],
        requiere_factura: d.requiere_factura || false,
        iva: d.iva || 0,
        archivos: d.archivos || null,
        notas: d.notas || ''
      }));
      setCards(mapped);
    }
    
    // 2. Prospectos (Manejo resiliente si la tabla no existe aún)
    try {
      const { data: prospectosData, error: prospectosError } = await supabase.from('prospectos').select('*').order('created_at', { ascending: false });
      if (!prospectosError && prospectosData) {
        const mappedProspectos = prospectosData.map((d: any) => ({
          id: d.id,
          cliente: d.nombre || 'Prospecto 3D',
          email: d.email || 'Sin correo',
          telefono: d.phone || d.telefono || 'No especificado',
          monto: 0,
          estado: 'prospecto' as const,
          fecha: d.created_at ? new Date(d.created_at).toLocaleString() : 'Reciente',
          rawDate: d.created_at ? new Date(d.created_at) : null,
          archivos: d.archivos || null,
          notas: d.notas || ''
        }));
        setProspectCards(mappedProspectos);
      }
    } catch (e) {
      console.warn("Tabla prospectos no encontrada aún.");
    }

    setRefreshing(false);
  };

  // Inicialización de datos (protegido por CrmLayout)
  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2500);

    fetchPedidos()
      .catch((err) => console.error("Error cargando pedidos:", err))
      .finally(() => {
        clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Drag and Drop States & Handlers
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('cardId', id);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    if (dragOverColumn !== colStatus) {
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;

    const isLead = prospectCards.some(p => p.id === cardId);
    if (isLead) {
       alert('Este prospecto viene de la simulación 3D. Necesitas un pedido formal para pasarlo de fase.');
       return;
    }

    // 1. Actualización en tiempo real en la UI
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, estado: newStatus as any } : c));
    
    // 2. Persistencia en la Base de Datos (Supabase)
    const { error } = await supabase.from('pedidos').update({ status: newStatus }).eq('id', cardId);
    if (error) {
      console.error("Error al actualizar estado del pedido en Supabase:", error);
      alert("Hubo un problema al guardar el nuevo estatus en la base de datos.");
      fetchPedidos(); // Revertir cambio en la UI
    }
  };

  const handleSaveNota = async () => {
    if (!selectedCard) return;
    setGuardandoNota(true);
    const tabla = selectedCard.estado === 'prospecto' ? 'prospectos' : 'pedidos';
    const { error } = await supabase.from(tabla).update({ notas: notaActual }).eq('id', selectedCard.id);
    
    if (error) {
      console.error("Error al guardar nota:", error);
      alert("Hubo un problema al guardar las notas.");
    } else {
      setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, notas: notaActual } : c));
      setProspectCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, notas: notaActual } : c));
      setSelectedCard({ ...selectedCard, notas: notaActual });
    }
    setGuardandoNota(false);
  };

  const handleDeleteCard = async (id: string, estado: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    if (estado === 'prospecto') {
      const { error } = await supabase.from('prospectos').delete().eq('id', id);
      if (error) {
        console.error("Error al eliminar prospecto:", error);
        alert("Hubo un problema al eliminar el prospecto.");
      } else {
        setProspectCards(prev => prev.filter(c => c.id !== id));
        setSelectedCard(null);
      }
    } else {
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) {
        console.error("Error al eliminar pedido:", error);
        alert("Hubo un problema al eliminar el pedido.");
      } else {
        setCards(prev => prev.filter(c => c.id !== id));
        setSelectedCard(null);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', color: '#eedfc6', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" color="#eedfc6" />
        <span className="font-bronco" style={{ letterSpacing: '0.1em' }}>Cargando Tablero CRM...</span>
      </div>
    );
  }

  // Filtrar por rango de fechas
  const filterByDate = (cardList: KanbanCard[]) => {
    return cardList.filter(card => {
      if (!card.rawDate) return true;
      
      const cardTime = card.rawDate.getTime();
      const now = new Date();

      if (filterPreset === '5days') {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(now.getDate() - 5);
        fiveDaysAgo.setHours(0, 0, 0, 0);
        return cardTime >= fiveDaysAgo.getTime();
      }

      if (filterPreset === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return cardTime >= thirtyDaysAgo.getTime();
      }

      if (filterPreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (!isNaN(start.getTime()) && cardTime < start.getTime()) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (!isNaN(end.getTime()) && cardTime > end.getTime()) return false;
        }
        return true;
      }

      return true;
    });
  };

  const filteredCards = filterByDate(cards);
  const filteredProspects = filterByDate(prospectCards);

  // Filtrar tarjetas por columna
  const prospectos = filteredProspects;
  const pendientes = filteredCards.filter(c => c.estado === 'pendiente' || c.estado === 'carrito');
  const comprados = filteredCards.filter(c => c.estado === 'comprado' || c.estado === 'pagado');
  const entregados = filteredCards.filter(c => c.estado === 'entregado');

  const handleMarkAsPaid = async (cardId: string) => {
    try {
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, estado: 'comprado' } : c));
      await supabase.from('pedidos').update({ status: 'comprado' }).eq('id', cardId);
      
      if (selectedCard) {
        // Enviar correo de notificación
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedCard.email,
              customerName: selectedCard.cliente,
              total: selectedCard.monto,
              isCustomDesign: false,
              items: selectedCard.articulos || []
            })
          });
        } catch (e) {
          console.warn('Error al notificar por correo:', e);
        }
        setSelectedCard({ ...selectedCard, estado: 'comprado' });
      }
      alert('¡El pedido se ha marcado como Pagado y Finalizado exitosamente!');
    } catch (err: any) {
      console.error('Error al actualizar pedido:', err);
      alert('Ocurrió un error al actualizar el estado.');
    }
  };

  const ColumnHeader = ({ title, count }: { title: string, count: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px 10px 0 0' }}>
      <span className="font-bronco" style={{ color: '#eedfc6', letterSpacing: '0.05em', fontSize: '1rem', textTransform: 'uppercase' }}>
        {title}
      </span>
      <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>
        {count}
      </span>
    </div>
  );

  const KanbanCardItem = ({ card }: { card: KanbanCard }) => {
    const isDraggable = card.estado !== 'prospecto';
    const isPendiente = card.estado === 'pendiente';
    
    return (
      <div 
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleDragStart(e, card.id) : undefined}
        onClick={() => setSelectedCard(card)}
        style={{ 
          background: '#151515', 
          padding: '1.1rem', 
          borderRadius: '10px', 
          border: '1px solid rgba(255,255,255,0.08)', 
          cursor: 'pointer', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.6rem', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          opacity: isDraggable ? 1 : 0.95,
          transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'rgba(238, 223, 198, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.01em', fontFamily: 'var(--font-outfit), sans-serif' }}>{card.cliente}</h4>
          <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: isPendiente ? '#eedfc6' : '#a1a1aa', fontWeight: 600, letterSpacing: '0.05em' }}>
            {isPendiente ? 'COTIZACIÓN' : `#${card.id.substring(0, 6)}`}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#888888', wordBreak: 'break-all' }}>{card.email}</p>
        
        {card.articulos && card.articulos.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#d4d4d8', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.35rem 0.6rem', borderRadius: '6px', marginTop: '0.2rem' }}>
            {card.articulos.length} {card.articulos.length === 1 ? 'producto' : 'productos'}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.7rem', color: '#666666' }}>{card.fecha}</span>
          {card.monto > 0 ? (
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#eedfc6' }}>
              ${card.monto.toLocaleString()} MXN
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#eedfc6', fontWeight: 600, letterSpacing: '0.05em' }}>LEAD 3D</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', overflowX: 'auto', background: '#0b0b0b', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header bar with Refresh & Date Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#121212', padding: '1.2rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
              ESTATUS EN TIEMPO REAL
            </span>
            <h2 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.04em', color: '#ffffff' }}>
              TABLERO DE PEDIDOS CRM
            </h2>
          </div>
          <button 
            onClick={fetchPedidos} 
            disabled={refreshing}
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)', color: '#eedfc6', padding: '0.5rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Date Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600 }}>
            Filtro de Fechas:
          </span>

          <div style={{ display: 'flex', gap: '0.3rem', background: '#181818', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setFilterPreset('5days')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === '5days' ? '#eedfc6' : 'transparent',
                color: filterPreset === '5days' ? '#0b0b0b' : '#a1a1aa',
                transition: 'all 0.15s'
              }}
            >
              Últimos 5 días
            </button>

            <button
              onClick={() => setFilterPreset('30days')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === '30days' ? '#eedfc6' : 'transparent',
                color: filterPreset === '30days' ? '#0b0b0b' : '#a1a1aa',
                transition: 'all 0.15s'
              }}
            >
              Últimos 30 días
            </button>

            <button
              onClick={() => setFilterPreset('all')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === 'all' ? '#eedfc6' : 'transparent',
                color: filterPreset === 'all' ? '#0b0b0b' : '#a1a1aa',
                transition: 'all 0.15s'
              }}
            >
              Todos
            </button>

            <button
              onClick={() => setFilterPreset('custom')}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === 'custom' ? '#eedfc6' : 'transparent',
                color: filterPreset === 'custom' ? '#0b0b0b' : '#a1a1aa',
                transition: 'all 0.15s'
              }}
            >
              Personalizado
            </button>
          </div>

          {filterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#181818', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>Inicio:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ border: '1px solid rgba(255,255,255,0.15)', background: '#121212', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', outline: 'none', color: '#ffffff' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>Fin:</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ border: '1px solid rgba(255,255,255,0.15)', background: '#121212', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', outline: 'none', color: '#ffffff' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flex: 1, minWidth: '1100px' }}>
        
        {/* Col 1: Prospecto */}
        <div style={{ flex: 1, background: '#101010', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <ColumnHeader title="Prospecto 3D" count={prospectos.length} />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
            {prospectos.map(card => <KanbanCardItem key={card.id} card={card} />)}
          </div>
        </div>

        {/* Col 2: Pendientes de Cotizar */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'pendiente')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'pendiente')}
          style={{ 
            flex: 1, 
            background: dragOverColumn === 'pendiente' ? 'rgba(238, 223, 198, 0.05)' : '#101010', 
            border: dragOverColumn === 'pendiente' ? '1px dashed #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Pendientes / Cotización" count={pendientes.length} />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
            {pendientes.map(card => <KanbanCardItem key={card.id} card={card} />)}
          </div>
        </div>

        {/* Col 3: Pagados / Finalizados */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'comprado')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'comprado')}
          style={{ 
            flex: 1, 
            background: dragOverColumn === 'comprado' ? 'rgba(238, 223, 198, 0.05)' : '#101010', 
            border: dragOverColumn === 'comprado' ? '1px dashed #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Pagados y Finalizados" count={comprados.length} />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
            {comprados.map(card => <KanbanCardItem key={card.id} card={card} />)}
          </div>
        </div>

        {/* Col 4: Pedidos Entregados */}
        <div 
          onDragOver={(e) => handleDragOver(e, 'entregado')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'entregado')}
          style={{ 
            flex: 1, 
            background: dragOverColumn === 'entregado' ? 'rgba(238, 223, 198, 0.05)' : '#101010', 
            border: dragOverColumn === 'entregado' ? '1px dashed #eedfc6' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Entregados" count={entregados.length} />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
            {entregados.map(card => <KanbanCardItem key={card.id} card={card} />)}
          </div>
        </div>

      </div>

      {/* POPUP MODAL: DETALLES COMPLETOS DEL PEDIDO */}
      {selectedCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#141414', color: '#ffffff', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', position: 'relative' }}>
            
            <button 
              onClick={() => setSelectedCard(null)} 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#222222', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}
            >
              <X size={18} />
            </button>

            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(238, 223, 198, 0.1)', border: '1px solid rgba(238, 223, 198, 0.25)', color: '#eedfc6', textTransform: 'uppercase' }}>
                  {selectedCard.estado === 'pendiente' ? 'Pendiente / Cotización' : selectedCard.estado === 'comprado' ? 'Pagado y Finalizado' : selectedCard.estado}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#71717a' }}>ID: #{selectedCard.id}</span>
              </div>
              <h3 className="font-bronco" style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', letterSpacing: '0.04em' }}>
                {selectedCard.estado === 'prospecto' ? 'DETALLE DE PROSPECCIÓN' : 'DETALLE DEL PEDIDO'}
              </h3>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>Fecha de registro: {selectedCard.fecha}</p>
            </div>

            {/* Datos del Cliente */}
            <div style={{ background: '#1c1c1c', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#eedfc6', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Información del Cliente
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Nombre Completo</span>
                  <strong style={{ color: '#ffffff' }}>{selectedCard.cliente}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Correo Electrónico</span>
                  <strong style={{ color: '#ffffff', wordBreak: 'break-all' }}>{selectedCard.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Teléfono</span>
                  <strong style={{ color: '#ffffff' }}>{selectedCard.telefono || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#71717a', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Dirección de Envío</span>
                  <strong style={{ color: '#ffffff' }}>{selectedCard.direccion || 'N/A'}{selectedCard.geographicState ? `, ${selectedCard.geographicState}` : ''}</strong>
                </div>
              </div>
            </div>

            {/* Archivos / Diseños Subidos */}
            <div style={{ marginBottom: '1.5rem', background: '#1c1c1c', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#eedfc6', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Diseños / Archivos Adjuntos
              </h4>
              {selectedCard.archivos && Object.keys(selectedCard.archivos).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.8rem' }}>
                  {Object.entries(selectedCard.archivos).map(([key, url]) => (
                    <div key={key} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', background: '#141414', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                        {key}
                      </span>
                      <img 
                        src={url} 
                        alt={key} 
                        onClick={() => setExpandedImage(url)}
                        style={{ width: '100%', height: '80px', objectFit: 'contain', cursor: 'pointer', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.2)', background: '#000000' }} 
                        title="Haz clic para expandir"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#71717a', fontStyle: 'italic' }}>
                  No se han adjuntado imágenes o diseños para este registro.
                </p>
              )}
            </div>

            {/* Lista de Artículos */}
            {selectedCard.articulos && selectedCard.articulos.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#eedfc6', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Productos Solicitados
                </h4>
                <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#1c1c1c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#a1a1aa' }}>Cant.</th>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#a1a1aa' }}>Producto</th>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#a1a1aa', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCard.articulos.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: '#eedfc6' }}>{item.cantidad}x</td>
                          <td style={{ padding: '0.6rem 0.8rem', color: '#ffffff' }}>{item.nombre}</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 700, color: '#ffffff' }}>
                            ${item.total ? item.total.toLocaleString() : '0'} MXN
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Acciones para Pedidos Pendientes de Cotización */}
            {selectedCard.estado === 'pendiente' && (
              <div style={{ background: '#181818', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(238, 223, 198, 0.25)', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', color: '#eedfc6', fontWeight: 700 }}>Gestión de Presupuesto y Cotización</h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                  Este pedido fue registrado con diseño personalizado. Al concretar la propuesta con el cliente, márcalo como pagado para iniciar la producción.
                </p>
                <button 
                  onClick={() => handleMarkAsPaid(selectedCard.id)}
                  className="font-bronco"
                  style={{ width: '100%', padding: '0.8rem', background: '#eedfc6', color: '#0b0b0b', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', letterSpacing: '0.04em' }}
                >
                  ✓ Marcar como Pagado
                </button>
              </div>
            )}

            {/* Monto Total */}
            {selectedCard.monto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#1c1c1c', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontWeight: 600, color: '#a1a1aa' }}>Monto Total Registrado:</span>
                <span className="font-bronco" style={{ fontSize: '1.3rem', color: '#eedfc6' }}>${selectedCard.monto.toLocaleString()} MXN</span>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => handleDeleteCard(selectedCard.id, selectedCard.estado)} 
                style={{ padding: '0.7rem 1.4rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Eliminar Registro
              </button>
              <button 
                onClick={() => setSelectedCard(null)} 
                style={{ padding: '0.7rem 1.6rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox / Expansión de Imagen */}
      {expandedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          onClick={() => setExpandedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setExpandedImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
            >
              <X size={32} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={expandedImage} 
              alt="Diseño Expandido" 
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', border: '2px solid #ffffff' }} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
