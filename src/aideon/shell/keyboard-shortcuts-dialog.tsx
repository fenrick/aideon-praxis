import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Kbd,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'design-system';

export interface ShortcutRow {
  readonly category: string;
  readonly name: string;
  readonly keys: readonly string[];
}

export interface KeyboardShortcutsDialogProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Default shortcut set for the shell. Keep in sync with Tauri menu accelerators.
 * @param t - Translation function scoped to the keyboard shortcuts dialog.
 * @param tActions - Translation function scoped to the shortcut action names.
 * @returns Shortcut rows.
 */
function defaultShortcuts(
  t: ReturnType<typeof useTranslations>,
  tActions: ReturnType<typeof useTranslations>,
): ShortcutRow[] {
  return [
    { category: t('categoryFile'), name: tActions('open'), keys: ['CmdOrCtrl', 'O'] },
    { category: t('categoryFile'), name: tActions('saveAs'), keys: ['CmdOrCtrl', 'Shift', 'S'] },
    { category: t('categoryFile'), name: tActions('print'), keys: ['CmdOrCtrl', 'P'] },
    {
      category: t('categoryShell'),
      name: tActions('commandPalette'),
      keys: ['CmdOrCtrl', 'K'],
    },
    {
      category: t('categoryShell'),
      name: tActions('toggleNavigation'),
      keys: ['CmdOrCtrl', 'B'],
    },
    {
      category: t('categoryShell'),
      name: tActions('toggleInspector'),
      keys: ['CmdOrCtrl', 'I'],
    },
  ];
}

/**
 * Lightweight keyboard shortcuts reference for the desktop shell.
 * @param root0 - Component props.
 * @param root0.open - Whether the dialog is open.
 * @param root0.onOpenChange - Open state setter.
 * @returns Dialog UI.
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProperties): ReactElement {
  const t = useTranslations('shell.keyboardShortcutsDialog');
  const tActions = useTranslations('shell.keyboardShortcutsDialog.actions');
  const shortcuts = defaultShortcuts(t, tActions);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="border-border/70 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">{t('columnCategory')}</TableHead>
                <TableHead>{t('columnAction')}</TableHead>
                <TableHead className="w-[220px] text-right">{t('columnShortcut')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortcuts.map((row) => (
                <TableRow key={`${row.category}:${row.name}`}>
                  <TableCell className="text-muted-foreground text-xs">{row.category}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1">
                      {row.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
