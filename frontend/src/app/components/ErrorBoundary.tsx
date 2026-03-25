import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-64 p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg text-slate-800 mb-2" style={{ fontWeight: 700 }}>
              Đã xảy ra lỗi
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Trang này gặp sự cố khi tải. Vui lòng thử lại.
            </p>
            {this.state.error && (
              <pre className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 transition-colors mx-auto"
              style={{ fontWeight: 600 }}>
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easy use with function components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
