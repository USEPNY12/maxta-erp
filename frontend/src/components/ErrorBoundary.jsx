import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force reload the current page to re-fetch any failed chunks
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>
            {isChunkError ? '📡' : '⚠️'}
          </div>
          <h2 style={{ color: '#1a237e', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
            {isChunkError ? 'Connection Issue' : 'Something went wrong'}
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '400px', lineHeight: '1.5' }}>
            {isChunkError
              ? 'Unable to load this page. Please check your internet connection and try again.'
              : 'An unexpected error occurred. Please try again or go back to the dashboard.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              Retry
            </button>
            <button
              onClick={this.handleGoHome}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              Go to Dashboard
            </button>
          </div>
          {!isChunkError && this.state.error && (
            <details style={{ marginTop: '2rem', color: '#999', fontSize: '0.8rem', maxWidth: '500px' }}>
              <summary style={{ cursor: 'pointer' }}>Technical Details</summary>
              <pre style={{ textAlign: 'left', overflow: 'auto', padding: '1rem', background: '#f9fafb', borderRadius: '4px', marginTop: '0.5rem' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
