import { Component, type ReactElement, type ReactNode } from 'react';

/**
 * Determines whether internal error details should be rendered.
 * Only enabled in development builds.
 */
function shouldShowErrorDetails(): boolean {
  return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
}

/**
 * Fallback UI rendered when a descendant throws during render.
 * @param root0
 * @param root0.error
 * @param root0.componentStack
 */
function ErrorBoundaryFallback({
  error,
  componentStack,
}: {
  readonly error?: Error;
  readonly componentStack?: string;
}): ReactElement {
  const showDetails = shouldShowErrorDetails();
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-8">
      <div className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-xl font-bold text-red-600">Something went wrong</h1>
        <p className="mb-4 text-sm text-gray-600">
          An error occurred while rendering the application.
        </p>
        {showDetails ? (
          <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs text-red-800">
            {error?.message}
            {error?.stack ? `\n\n${error.stack}` : undefined}
            {componentStack ? `\n\n${componentStack}` : undefined}
          </pre>
        ) : undefined}
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

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

interface ErrorBoundaryProperties {
  readonly children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProperties, ErrorBoundaryState> {
  constructor(properties: ErrorBoundaryProperties) {
    super(properties);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ componentStack: errorInfo.componentStack ?? undefined });
  }

  override render(): ReactElement {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
        />
      );
    }

    return <div className="contents">{this.props.children}</div>;
  }
}
