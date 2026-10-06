import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by RootErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b111e',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              Khởi Động NKI Studio
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
              Đã phát hiện một sự cố khi nạp giao diện. Vui lòng bấm làm mới để tải lại dữ liệu an toàn.
            </p>
            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#fca5a5',
                textAlign: 'left',
                overflowX: 'auto'
              }}>
                {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Tải Lại Trang
              </button>
              <button
                onClick={() => {
                  try {
                    window.localStorage.clear();
                    window.location.reload();
                  } catch (e) {}
                }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Xóa Cache & Tải Lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);