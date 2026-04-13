import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-enter container" style={{ 
          textAlign: 'center', 
          paddingTop: '120px', 
          paddingBottom: '80px',
          direction: 'rtl' 
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px', color: 'var(--accent-primary)' }}>
            عذراً، حدث خطأ ما
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1.1rem' }}>
            واجه التطبيق مشكلة غير متوقعة. يرجى محاولة تحديث الصفحة.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => window.location.reload()}
            style={{ gap: '8px' }}
          >
            🔄 تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
