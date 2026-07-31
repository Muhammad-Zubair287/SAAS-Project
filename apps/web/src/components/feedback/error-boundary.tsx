'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    if (process.env['NODE_ENV'] !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error);
      }
      if (fallback) return fallback;

      return (
        <div
          role="alert"
          className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8"
        >
          <p className="text-body-md text-semantic-danger">
            Something went wrong.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-md bg-brand-blue-600 px-4 py-2 text-body-sm text-white hover:bg-brand-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-600"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
