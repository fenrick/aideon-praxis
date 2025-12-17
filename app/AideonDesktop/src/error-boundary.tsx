import { Component, type ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-red-50 p-8">
          <div className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-lg">
            <h1 className="mb-4 text-xl font-bold text-red-600">Something went wrong</h1>
            <p className="mb-4 text-sm text-gray-600">
              An error occurred while rendering the application.
            </p>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs text-red-800">
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              onClick={() => {
                globalThis.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
