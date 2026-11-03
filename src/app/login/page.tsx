'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Verificar si hay una sesión válida activa
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (isMounted && session && !error) {
          window.location.replace('/crm/');
        } else if (error) {
          // Si el token es inválido o expiró, limpiamos la sesión para evitar loops
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.error("Error al validar sesión:", err);
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (data?.user) {
        window.location.replace('/crm/');
      }
    } catch (err: any) {
      setErrorMsg('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b0b', color: '#ffffff', fontFamily: 'var(--font-outfit), sans-serif', padding: '1.5rem' }}>
      
      <Link href="/" style={{ position: 'absolute', top: '2rem', left: '2rem', color: '#eedfc6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        ← Volver al Simulador
      </Link>

      <div style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', background: '#141414', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '18px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(238, 223, 198, 0.1)', border: '1px solid rgba(238, 223, 198, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
            <Lock size={28} style={{ color: '#eedfc6' }} />
          </div>
          <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#eedfc6', fontWeight: 700 }}>
            PANEL ADMINISTRATIVO
          </span>
          <h1 className="font-bronco" style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem', color: '#ffffff', letterSpacing: '0.04em' }}>
            ACCESO CRM
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>Ingresa tus credenciales administrativas</p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Correo Electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#eedfc6' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@omarstudio.com.mx"
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.6rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: '#eedfc6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#eedfc6' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.6rem', background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="font-bronco"
            style={{ marginTop: '0.75rem', padding: '1rem', background: '#eedfc6', color: '#0b0b0b', fontWeight: 800, borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'all 0.2s', opacity: loading ? 0.7 : 1, fontSize: '1.05rem', letterSpacing: '0.04em', boxShadow: '0 4px 20px rgba(238, 223, 198, 0.25)' }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>INGRESAR AL CRM <ArrowRight size={18} /></>
            )}
          </button>
        </form>
        {loading && (
           <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#eedfc6', textAlign: 'center' }}>
             Procesando inicio de sesión...
           </p>
        )}
      </div>
    </div>
  );
}
