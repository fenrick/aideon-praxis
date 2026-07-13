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

/** Translated labels for the error boundary fallback UI. */
export interface ErrorBoundaryLabels {
  readonly title: string;
  readonly description: string;
  readonly renderError: string;
  readonly devDetails: string;
  readonly fatalError: string;
  readonly reload: string;
  readonly copyDetails: string;
}

const DEFAULT_LABELS: ErrorBoundaryLabels = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred while rendering Aideon. Reload the app to recover.',
  renderError: 'Render error',
  devDetails: 'Details are shown because this is a development build.',
  fatalError: 'The application encountered a fatal UI error.',
  reload: 'Reload',
  copyDetails: 'Copy details',
};

/**
 * Fallback UI rendered when a descendant throws during render.
 * @param root0
 * @param root0.error
 * @param root0.componentStack
 * @param root0.labels
 */
function ErrorBoundaryFallback({
  error,
  componentStack,
  labels = DEFAULT_LABELS,
}: {
  readonly error?: Error;
  readonly componentStack?: string;
  readonly labels?: ErrorBoundaryLabels;
}): ReactElement {
  const showDetails = shouldShowErrorDetails();
  const { hasDetails, details } = buildErrorDetails({ error, componentStack });

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="text-destructive size-5" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>{labels.renderError}</AlertTitle>
            <AlertDescription>
              {showDetails && hasDetails && labels.devDetails}
              {(!showDetails || !hasDetails) && labels.fatalError}
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
              {labels.reload}
            </Button>
            {showDetails && hasDetails ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(details).catch(() => false);
                }}
              >
                {labels.copyDetails}
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
  /**
   * Translated labels for the fallback UI. React error boundaries must be
   * class components, which cannot call hooks (e.g. `useTranslations`), so
   * callers resolve the labels in a functional parent and pass them down.
   * Falls back to English defaults when omitted.
   */
  readonly labels?: ErrorBoundaryLabels;
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
          labels={this.props.labels}
        />
      );
    }

    return <div className="contents">{this.props.children}</div>;
  }
}
