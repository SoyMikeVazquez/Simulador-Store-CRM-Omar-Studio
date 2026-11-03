'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, PackageSearch, LogOut, Menu, X, Users, Loader2, StickyNote, FileText, History, Mail, ShieldAlert, LogIn, Globe } from 'lucide-react';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const isAuthResolvedRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: si la verificación tarda más de 2 segundos, terminar estado de carga
    const authTimeout = setTimeout(() => {
      if (isMounted && !isAuthResolvedRef.current) {
        isAuthResolvedRef.current = true;
        setIsAuthenticated(false);
      }
    }, 2000);

    // Verificar sesión activa en Supabase
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        isAuthResolvedRef.current = true;
        if (!session || error) {
          // Limpiar token corrupto si hubo error
          if (error) {
            await supabase.auth.signOut().catch(() => {});
          }
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (isMounted) {
          isAuthResolvedRef.current = true;
          setIsAuthenticated(false);
        }
      } finally {
        clearTimeout(authTimeout);
      }
    };

    checkAuth();

    // Escuchar cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        isAuthResolvedRef.current = true;
        setIsAuthenticated(false);
      } else if (session?.user) {
        isAuthResolvedRef.current = true;
        setIsAuthenticated(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    window.location.href = '/login/';
  };

  const navLinks = [
    { name: "Omar's CRM", href: '/crm/', icon: <LayoutDashboard size={18} /> },
    { name: 'Productos Mayoreo', href: '/crm/productos/', icon: <PackageSearch size={18} /> },
    { name: 'Generar Nota de Venta', href: '/crm/crear-nota/', icon: <FileText size={18} /> },
    { name: 'Historial Notas PDF', href: '/crm/historial-notas/', icon: <History size={18} /> },
    { name: 'Campañas de Correo', href: '/crm/campanas/', icon: <Mail size={18} /> },
    { name: 'Personalización Web', href: '/crm/personalizacion-web/', icon: <Globe size={18} /> },
  ];

  // 1. Estado Verificando: Solo spinner temporal (máx 2 seg)
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', gap: '1.25rem' }}>
        <Loader2 size={38} className="animate-spin" color="#eedfc6" />
        <span className="font-bronco" style={{ color: '#eedfc6', letterSpacing: '0.12em', fontSize: '0.95rem' }}>Verificando Acceso CRM...</span>
      </div>
    );
  }

  // 2. Estado Sin Sesión: Pantalla de bloqueo elegante con acción directa (nunca se queda trabado)
  if (isAuthenticated === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', color: '#ffffff', fontFamily: 'var(--font-outfit), sans-serif', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', background: '#121212', border: '1px solid rgba(238, 223, 198, 0.25)', borderRadius: '20px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(238, 223, 198, 0.08)', border: '1px solid rgba(238, 223, 198, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <ShieldAlert size={30} color="#eedfc6" />
          </div>
          <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700, marginBottom: '0.35rem' }}>
            Seguridad & Autenticación
          </span>
          <h2 className="font-bronco" style={{ margin: '0 0 0.85rem 0', fontSize: '1.8rem', color: '#ffffff', letterSpacing: '0.04em' }}>
            ACCESO RESTRINGIDO
          </h2>
          <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.85rem', color: '#a1a1aa', lineHeight: 1.5 }}>
            No se detectó una sesión administrativa activa o tu sesión ha caducado. Por favor inicia sesión para acceder al panel de control de Omar Studio.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a
              href="/login/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.9rem',
                background: '#eedfc6',
                color: '#0b0b0b',
                fontWeight: 700,
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 10px 25px rgba(238, 223, 198, 0.2)',
                transition: 'all 0.2s',
              }}
            >
              <LogIn size={18} /> Iniciar Sesión en CRM
            </a>
            <a
              href="/"
              style={{
                display: 'block',
                padding: '0.75rem',
                background: 'transparent',
                color: '#eedfc6',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'none',
                opacity: 0.8,
              }}
            >
              ← Volver a la Tienda Pública
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', background: '#0b0b0b', color: '#ffffff', fontFamily: 'var(--font-outfit), sans-serif', position: 'relative' }}>
      
      {/* Left Sidebar (Desktop) */}
      <aside className="sidebar-desktop" style={{ width: '260px', background: '#0f0f0f', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '2rem 1.5rem', flex: 1 }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <span className="font-bronco" style={{ display: 'block', fontSize: '1.35rem', color: '#eedfc6', letterSpacing: '0.04em', lineHeight: 1.1, marginBottom: '0.35rem' }}>
              OMAR LABS STUDIO
            </span>
            <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#a1a1aa', fontWeight: 600 }}>
              PANEL ADMINISTRATIVO
            </span>
          </div>

          <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                    color: isActive ? '#eedfc6' : '#a1a1aa',
                    background: isActive ? 'rgba(238, 223, 198, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(238, 223, 198, 0.3)' : '1px solid transparent',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: isActive ? '#eedfc6' : '#71717a' }}>{link.icon}</span>
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '0.8rem 1rem', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0b0b0b' }}>
        
        {/* Header */}
        <header style={{ padding: '1rem 2rem', background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Mobile Menu Toggle (Left side for mobile) */}
            <button 
              className="md-hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', color: '#eedfc6', marginLeft: '-0.5rem' }}
            >
              <Menu size={24} />
            </button>
            
            {/* Logo de Omar Studio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span className="font-bronco" style={{ fontSize: '1.15rem', color: '#eedfc6', letterSpacing: '0.04em' }}>
                OMAR LABS STUDIO
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <a 
               href="/order" 
               target="_blank"
               className="font-bronco"
               style={{ 
                 fontSize: '0.85rem', 
                 color: '#eedfc6', 
                 textDecoration: 'none', 
                 padding: '0.4rem 0.9rem', 
                 border: '1px solid rgba(238, 223, 198, 0.3)', 
                 borderRadius: '6px',
                 background: 'rgba(238, 223, 198, 0.08)',
                 letterSpacing: '0.04em'
               }}
             >
               Ver Tienda Mayoreo ↗
             </a>
          </div>
        </header>

        {/* Dynamic Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#0b0b0b' }}>
          {children}
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 40 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu (Left side) */}
      <div 
        style={{ 
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: '#111111', zIndex: 50, 
          transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)', 
          transition: 'transform 0.3s ease', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-bronco" style={{ color: '#eedfc6', fontSize: '1.2rem', letterSpacing: '0.04em' }}>OMAR&apos;S CRM</span>
          <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}>
            <X size={22} />
          </button>
        </div>
        
        <div style={{ padding: '1.5rem', flex: 1 }}>
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
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#eedfc6' : '#a1a1aa',
                    background: isActive ? 'rgba(238, 223, 198, 0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(238, 223, 198, 0.3)' : '1px solid transparent',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <span style={{ color: isActive ? '#eedfc6' : '#71717a' }}>{link.icon}</span>
                  {link.name}
                </a>
              );
            })}
          </nav>
        </div>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, padding: '0.9rem', borderRadius: '8px' }}>
            <LogOut size={16} /> Cerrar Sesión
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
