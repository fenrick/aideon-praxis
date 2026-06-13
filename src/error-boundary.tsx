import { Component, type ReactElement, type ReactNode } from 'react';

import { AlertTriangleIcon } from 'design-system/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
} from 'design-system';
import { isDevelopmentBuild } from './lib/runtime';

/**
 * Determines whether internal error details should be rendered.
 * Only enabled in development builds.
 */
function shouldShowErrorDetails(): boolean {
  return isDevelopmentBuild();
}

/**
 *
 * @param root0
 * @param root0.error
 * @param root0.componentStack
 */
function buildErrorDetails({
  error,
  componentStack,
}: {
  readonly error?: Error;
  readonly componentStack?: string;
}): { readonly hasDetails: boolean; readonly details: string } {
  const parts: string[] = [];
  if (error?.message) {
    parts.push(error.message);
  }
  if (error?.stack) {
    parts.push(error.stack);
  }
  if (componentStack) {
    parts.push(componentStack);
  }

  const details = parts.join('\n\n');
  return { hasDetails: details.trim().length > 0, details };
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
  const { hasDetails, details } = buildErrorDetails({ error, componentStack });

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="text-destructive size-5" />
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred while rendering Aideon. Reload the app to recover.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>Render error</AlertTitle>
            <AlertDescription>
              {showDetails &&
                hasDetails &&
                'Details are shown because this is a development build.'}
              {(!showDetails || !hasDetails) && 'The application encountered a fatal UI error.'}
            </AlertDescription>
          </Alert>

          {showDetails && hasDetails ? (
            <ScrollArea className="bg-muted/30 h-[240px] rounded-lg border">
              <pre className="text-foreground p-4 text-xs leading-relaxed">{details}</pre>
            </ScrollArea>
          ) : undefined}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                globalThis.location.reload();
              }}
            >
              Reload
            </Button>
            {showDetails && hasDetails ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(details).catch(() => false);
                }}
              >
                Copy details
              </Button>
            ) : undefined}
          </div>
        </CardContent>
      </Card>
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
