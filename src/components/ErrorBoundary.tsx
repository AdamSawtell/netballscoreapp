/**
 * Error Boundary Component
 * Comprehensive error handling for production stability
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('🚨 Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              The netball scorer encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-50 p-4 rounded mb-4">
                <summary className="font-semibold cursor-pointer">Error Details</summary>
                <pre className="text-sm mt-2 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                🔄 Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium"
              >
                🏠 Go Home
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>If this problem persists, please contact support.</p>
              <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Specialized error boundary for timer-related errors
 */
export function TimerErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-semibold">Timer Error</h3>
              <p className="text-red-700 text-sm">
                The timer system encountered an error. Please refresh the page to continue.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('🎯 Timer Error:', error);
        console.error('📍 Component Stack:', errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for API-related errors
 */
export function APIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="text-yellow-600 text-xl mr-3">🌐</div>
            <div>
              <h3 className="text-yellow-800 font-semibold">Connection Error</h3>
              <p className="text-yellow-700 text-sm">
                Unable to connect to the game server. Please check your connection.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
          >
            Try Again
          </button>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('🌐 API Error:', error);
        console.error('📍 Component Stack:', errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
