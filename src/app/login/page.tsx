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
          window.location.href = '/crm';
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
        window.location.href = '/crm';
      }
    } catch (err: any) {
      setErrorMsg('Ocurrió un error al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', color: '#18181b', fontFamily: 'system-ui, sans-serif' }}>
      
      <Link href="/" style={{ position: 'absolute', top: '2rem', left: '2rem', color: '#52525b', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Volver al inicio
      </Link>

      <div style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Lock size={28} style={{ color: '#18181b' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Acceso CRM</h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#52525b' }}>Ingresa tus credenciales administrativas</p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#3f3f46' }}>
              Correo Electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '8px', color: '#000', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#3f3f46' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', background: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '8px', color: '#000', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '0.9rem', background: '#18181b', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>Ingresar al CRM <ArrowRight size={18} /></>
            )}
          </button>
        </form>
        {loading && (
           <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
             Procesando inicio de sesión... (Si esto no desaparece, por favor recarga la página)
           </p>
        )}
      </div>
    </div>
  );
}
