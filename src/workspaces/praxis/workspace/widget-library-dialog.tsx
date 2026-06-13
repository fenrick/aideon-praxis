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
import type { PraxisWidgetKind as WidgetKind } from 'praxis/types';
import type { WidgetRegistryEntry } from 'praxis/widgets/registry';

interface WidgetLibraryDialogProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly registry: WidgetRegistryEntry[];
  readonly onCreate: (type: WidgetKind) => void;
}

/**
 * Dialog listing registered widget types to add to the active template.
 * @param root0 - Dialog props.
 * @param root0.open - Whether the dialog is open.
 * @param root0.onOpenChange - Open-state change handler.
 * @param root0.registry - Available widget registry entries.
 * @param root0.onCreate - Handler invoked with the chosen widget type.
 */
export function WidgetLibraryDialog({
  open,
  onOpenChange,
  registry,
  onCreate,
}: WidgetLibraryDialogProperties) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add widget</DialogTitle>
          <DialogDescription>Choose a widget type to add to this template.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {registry.map((entry) => (
            <button
              key={entry.type}
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
          {registry.length === 0 ? (
            <p className="text-muted-foreground text-sm">No widget types registered.</p>
          ) : undefined}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
