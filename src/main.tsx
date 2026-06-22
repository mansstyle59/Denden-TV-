import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null };
  constructor(props: {children: React.ReactNode}) {
    super(props);
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: '20px', color: '#ff4444', backgroundColor: '#111', height: '100vh', overflow: 'auto', fontFamily: 'monospace'}}>
        <h2>Application Error Caught by ErrorBoundary:</h2>
        <h3 style={{color: 'white'}}>{this.state.error?.message}</h3>
        <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px'}}>{this.state.error?.stack}</pre>
      </div>;
    }
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
