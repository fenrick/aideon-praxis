import { useTranslations } from 'next-intl';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'design-system';
import type { WidgetContribution } from './engine';

interface WidgetLibraryDialogProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly widgets: readonly WidgetContribution[];
  readonly onCreate: (type: string) => void;
}

/**
 * Dialog listing the widgets contributed by licensed engines to add to the
 * active layout.
 * @param root0 - Dialog props.
 * @param root0.open - Whether the dialog is open.
 * @param root0.onOpenChange - Open-state change handler.
 * @param root0.widgets - Available widget contributions (from the catalog).
 * @param root0.onCreate - Handler invoked with the chosen widget type.
 */
export function WidgetLibraryDialog({
  open,
  onOpenChange,
  widgets,
  onCreate,
}: WidgetLibraryDialogProperties) {
  const t = useTranslations('platform.widgetLibraryDialog');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {widgets.map((entry) => (
            <button
              key={`${entry.engineId}-${entry.type}`}
              type="button"
              className="border-border/70 bg-card hover:border-primary/50 hover:bg-muted/40 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left"
              onClick={() => {
                onCreate(entry.type);
              }}
            >
              <div>
                <p className="text-sm font-semibold">{entry.label}</p>
                <p className="text-muted-foreground text-xs">{entry.description}</p>
              </div>
              <Badge variant="outline">{entry.defaultSize}</Badge>
            </button>
          ))}
          {widgets.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          ) : undefined}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
