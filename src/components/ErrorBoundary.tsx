import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in 3D Scene:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Html center>
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid red',
            color: 'red',
            padding: '1.5rem',
            borderRadius: '8px',
            width: '300px',
            textAlign: 'center',
            fontFamily: 'sans-serif'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Error en Renderizado 3D</h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              {this.state.error?.message || 'Error desconocido al cargar texturas o modelos.'}
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '10px', color: '#666' }}>
              Revisa la consola (F12) para más detalles.
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}
