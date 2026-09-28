'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, PackageSearch, LogOut, Menu, X, Users, Loader2, StickyNote, FileText, History } from 'lucide-react';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Verificar sesión activa
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!session || error) {
          setIsAuthenticated(false);
          window.location.href = '/login/';
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
          window.location.href = '/login/';
        }
      }
    };

    checkAuth();

    // Escuchar cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        setIsAuthenticated(false);
        window.location.href = '/login/';
      } else if (session?.user) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login/';
  };

  const navLinks = [
    { name: "Omar's CRM", href: '/crm/', icon: <LayoutDashboard size={18} /> },
    { name: 'Productos Mayoreo', href: '/crm/productos/', icon: <PackageSearch size={18} /> },
    { name: 'Generar Nota de Venta', href: '/crm/crear-nota/', icon: <FileText size={18} /> },
    { name: 'Historial Notas PDF', href: '/crm/historial-notas/', icon: <History size={18} /> },
  ];

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <Loader2 size={32} className="animate-spin" color="#18181b" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', background: '#f8f9fa', color: '#18181b', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      
      {/* Left Sidebar (Desktop) */}
      <aside className="sidebar-desktop" style={{ width: '260px', background: '#ffffff', borderRight: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '2rem 1.5rem', flex: 1 }}>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Navegación
          </p>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navLinks.map((link) => {
              const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
              const normalizedHref = link.href.endsWith('/') && link.href !== '/' ? link.href.slice(0, -1) : link.href;
              const isActive = normalizedPath === normalizedHref;
              return (
                <a 
                  key={link.href} 
                  href={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#18181b' : '#52525b',
                    background: isActive ? 'rgba(0,0,0,0.04)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {link.icon}
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.9rem', padding: '0.8rem 1rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Header */}
        <header style={{ padding: '1rem 2rem', background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Mobile Menu Toggle (Left side for mobile) */}
            <button 
              className="md-hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', color: '#18181b', marginLeft: '-1rem' }}
            >
              <Menu size={24} />
            </button>
            
            {/* Logo de Omar Studio */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                 src="/logo.png" 
                 alt="Omar Studio" 
                 style={{ height: '40px', objectFit: 'contain' }} 
                 onError={(e) => {
                   // Fallback visual en caso de que logo.png no exista
                   e.currentTarget.style.display = 'none';
                   const nextSibling = e.currentTarget.nextElementSibling as HTMLElement;
                   if (nextSibling) nextSibling.style.display = 'flex';
                 }}
               />
               {/* Fallback de texto si falla la imagen */}
               <div style={{ display: 'none', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
                 OMAR STUDIO
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             {/* Espacio reservado para notificaciones o perfiles en el lado derecho */}
          </div>
        </header>

        {/* Dynamic Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu (Left side) */}
      <div 
        style={{ 
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#ffffff', zIndex: 50, 
          transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', 
          transition: 'transform 0.3s ease', display: 'flex', flexDirection: 'column' 
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>Menú</span>
          <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ padding: '2rem 1.5rem', flex: 1 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navLinks.map((link) => {
              const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
              const normalizedHref = link.href.endsWith('/') && link.href !== '/' ? link.href.slice(0, -1) : link.href;
              const isActive = normalizedPath === normalizedHref;
              return (
                <a 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#18181b' : '#52525b',
                    background: isActive ? 'rgba(0,0,0,0.04)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {link.icon}
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '1rem', padding: '1rem', borderRadius: '8px' }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
      
      {/* CSS For Media Queries */}
      <style>{`
        @media (min-width: 769px) {
          .md-hidden { display: none !important; }
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}
