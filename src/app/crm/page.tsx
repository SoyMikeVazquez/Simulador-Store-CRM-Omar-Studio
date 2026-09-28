'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShoppingCart, Package, Truck, Search, Loader2, RefreshCw, X, FileText, MapPin, Phone, Mail, User, Calendar, Filter } from 'lucide-react';

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
    fetchPedidos().finally(() => {
      setLoading(false);
    });
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', color: '#18181b' }}>
        <Loader2 size={32} className="animate-spin" />
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

  const ColumnHeader = ({ title, count, icon, color }: { title: string, count: number, icon: React.ReactNode, color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#ffffff', borderBottom: `2px solid ${color}`, borderRadius: '8px 8px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#18181b', fontWeight: 600, fontSize: '0.9rem' }}>
        {icon}
        {title}
      </div>
      <span style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', color: '#52525b' }}>
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
          background: '#ffffff', 
          padding: '1rem', 
          borderRadius: '8px', 
          border: isPendiente ? '1px dashed #f59e0b' : '1px solid rgba(0,0,0,0.08)', 
          cursor: 'pointer', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          opacity: isDraggable ? 1 : 0.95,
          transition: 'transform 0.15s, boxShadow 0.15s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#18181b' }}>{card.cliente}</h4>
          <span style={{ fontSize: '0.7rem', background: isPendiente ? '#fef3c7' : 'rgba(0,0,0,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: isPendiente ? '#b45309' : '#71717a', fontWeight: isPendiente ? 700 : 400 }}>
            {isPendiente ? 'COTIZAR' : `#${card.id.substring(0, 6)}`}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#52525b', wordBreak: 'break-all' }}>{card.email}</p>
        
        {card.articulos && card.articulos.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: '#71717a', background: '#f4f4f5', padding: '0.4rem 0.6rem', borderRadius: '4px', marginTop: '0.2rem' }}>
            📦 {card.articulos.length} producto(s)
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>{card.fecha}</span>
          {card.monto > 0 ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: card.estado === 'comprado' ? '#10b981' : '#d97706' }}>
              ${card.monto.toLocaleString()} MXN
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#a1a1aa' }}>Lead 3D</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', overflowX: 'auto', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Header bar with Refresh & Date Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff', padding: '1rem 1.2rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Tablero de Pedidos CRM</h2>
          <button 
            onClick={fetchPedidos} 
            disabled={refreshing}
            style={{ background: '#f8f9fa', border: '1px solid rgba(0,0,0,0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Date Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#52525b', fontWeight: 600 }}>
            <Calendar size={16} color="#18181b" />
            <span>Filtro de Fechas:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem', background: '#f1f3f5', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setFilterPreset('5days')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === '5days' ? '#18181b' : 'transparent',
                color: filterPreset === '5days' ? '#ffffff' : '#52525b',
                transition: 'all 0.15s'
              }}
            >
              Últimos 5 días
            </button>

            <button
              onClick={() => setFilterPreset('30days')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === '30days' ? '#18181b' : 'transparent',
                color: filterPreset === '30days' ? '#ffffff' : '#52525b',
                transition: 'all 0.15s'
              }}
            >
              Últimos 30 días
            </button>

            <button
              onClick={() => setFilterPreset('all')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === 'all' ? '#18181b' : 'transparent',
                color: filterPreset === 'all' ? '#ffffff' : '#52525b',
                transition: 'all 0.15s'
              }}
            >
              Todos
            </button>

            <button
              onClick={() => setFilterPreset('custom')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: filterPreset === 'custom' ? '#18181b' : 'transparent',
                color: filterPreset === 'custom' ? '#ffffff' : '#52525b',
                transition: 'all 0.15s'
              }}
            >
              Personalizado
            </button>
          </div>

          {filterPreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8f9fa', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#52525b', fontWeight: 600 }}>Inicio:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', outline: 'none', color: '#18181b' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#52525b', fontWeight: 600 }}>Fin:</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', outline: 'none', color: '#18181b' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minWidth: '1100px' }}>
        
        {/* Col 1: Prospecto */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.02)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
          <ColumnHeader title="Prospecto 3D" count={prospectos.length} icon={<Users size={16} />} color="#60a5fa" />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
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
            background: dragOverColumn === 'pendiente' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(0,0,0,0.02)', 
            border: dragOverColumn === 'pendiente' ? '2px dashed #fbbf24' : '2px solid transparent',
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Pendientes / Cotización" count={pendientes.length} icon={<ShoppingCart size={16} />} color="#fbbf24" />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
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
            background: dragOverColumn === 'comprado' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0,0,0,0.02)', 
            border: dragOverColumn === 'comprado' ? '2px dashed #10b981' : '2px solid transparent',
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Pagados y Finalizados" count={comprados.length} icon={<Package size={16} />} color="#10b981" />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
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
            background: dragOverColumn === 'entregado' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.02)', 
            border: dragOverColumn === 'entregado' ? '2px dashed #6366f1' : '2px solid transparent',
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'all 0.2s'
          }}
        >
          <ColumnHeader title="Entregados" count={entregados.length} icon={<Truck size={16} />} color="#6366f1" />
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
            {entregados.map(card => <KanbanCardItem key={card.id} card={card} />)}
          </div>
        </div>

      </div>

      {/* POPUP MODAL: DETALLES COMPLETOS DEL PEDIDO */}
      {selectedCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            <button 
              onClick={() => setSelectedCard(null)} 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f4f4f5', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#52525b' }}
            >
              <X size={18} />
            </button>

            <div style={{ borderBottom: '1px solid #f4f4f5', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px', background: selectedCard.estado === 'prospecto' ? '#dbeafe' : selectedCard.estado === 'pendiente' ? '#fef3c7' : selectedCard.estado === 'comprado' ? '#d1fae5' : '#e0e7ff', color: selectedCard.estado === 'prospecto' ? '#1e40af' : selectedCard.estado === 'pendiente' ? '#92400e' : selectedCard.estado === 'comprado' ? '#065f46' : '#3730a3', textTransform: 'uppercase' }}>
                  {selectedCard.estado === 'pendiente' ? 'Pendiente / Cotización' : selectedCard.estado === 'comprado' ? 'Pagado y Finalizado' : selectedCard.estado}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#71717a' }}>ID: #{selectedCard.id}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                {selectedCard.estado === 'prospecto' ? 'Detalle de Prospección' : 'Detalle del Pedido'}
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>Fecha de registro: {selectedCard.fecha}</p>
            </div>

            {/* Datos del Cliente */}
            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1.2rem', marginBottom: '1.5rem', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} color="#18181b" /> Información del Cliente
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Nombre Completo</span>
                  <strong style={{ color: '#0f172a' }}>{selectedCard.cliente}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Correo Electrónico</span>
                  <strong style={{ color: '#0f172a', wordBreak: 'break-all' }}>{selectedCard.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Teléfono</span>
                  <strong style={{ color: '#0f172a' }}>{selectedCard.telefono || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Dirección de Envío</span>
                  <strong style={{ color: '#0f172a' }}>{selectedCard.direccion || 'N/A'}{selectedCard.geographicState ? `, ${selectedCard.geographicState}` : ''}</strong>
                </div>
              </div>
            </div>

            {/* Archivos / Diseños Subidos */}
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <FileText size={16} color="#18181b" /> Diseños / Archivos Adjuntos
              </h4>
              {selectedCard.archivos && Object.keys(selectedCard.archivos).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.8rem' }}>
                  {Object.entries(selectedCard.archivos).map(([key, url]) => (
                    <div key={key} style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem', background: '#ffffff', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                        {key}
                      </span>
                      <img 
                        src={url} 
                        alt={key} 
                        onClick={() => setExpandedImage(url)}
                        style={{ width: '100%', height: '80px', objectFit: 'contain', cursor: 'pointer', borderRadius: '4px', border: '1px dashed #e2e8f0', background: '#000000' }} 
                        title="Haz clic para expandir"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                  No se han adjuntado imágenes o diseños para este registro.
                </p>
              )}
            </div>

            {/* Lista de Artículos */}
            {selectedCard.articulos && selectedCard.articulos.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} color="#18181b" /> Productos Solicitados
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#64748b' }}>Cant.</th>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#64748b' }}>Producto</th>
                        <th style={{ padding: '0.6rem 0.8rem', color: '#64748b', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCard.articulos.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{item.cantidad}x</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{item.nombre}</td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 600 }}>
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
              <div style={{ background: '#fffbebfb', padding: '1rem', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#92400e', fontWeight: 700 }}>Gestión de Presupuesto y Cotización</h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#78350f' }}>
                  Este pedido fue registrado con diseño personalizado. Al concretar la propuesta con el cliente, genera su link de pago o márcalo como pagado.
                </p>
                <button 
                  onClick={() => handleMarkAsPaid(selectedCard.id)}
                  style={{ width: '100%', padding: '0.8rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  ✓ Marcar como Pagado
                </button>
              </div>
            )}

            {/* Monto Total */}
            {selectedCard.monto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: selectedCard.estado === 'comprado' ? '#ecfdf5' : '#f8f9fa', borderRadius: '8px', border: selectedCard.estado === 'comprado' ? '1px solid #a7f3d0' : '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 600, color: selectedCard.estado === 'comprado' ? '#065f46' : '#18181b' }}>Monto Total Registrado:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: selectedCard.estado === 'comprado' ? '#047857' : '#18181b' }}>${selectedCard.monto.toLocaleString()} MXN</span>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => handleDeleteCard(selectedCard.id, selectedCard.estado)} 
                style={{ padding: '0.7rem 1.5rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Eliminar Registro
              </button>
              <button 
                onClick={() => setSelectedCard(null)} 
                style={{ padding: '0.7rem 1.5rem', background: '#18181b', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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
