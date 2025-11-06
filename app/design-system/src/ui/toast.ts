type ToastVariant = 'info' | 'success' | 'error' | 'warning';
export interface ToastItem {
  id: string;
  text: string;
  variant: ToastVariant;
  timeoutMs?: number;
}

const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

export function subscribe(listener: (items: ToastItem[]) => void): () => void {
  listeners.add(listener);
  listener(items);
  return () => listeners.delete(listener);
}
function emit() {
  for (const l of listeners) l(items);
}

let idCounter = 0;
function makeId(): string {
  try {
    const u32 = crypto.getRandomValues(new Uint32Array(1))[0];
    return `${Date.now().toString(36)}-${u32.toString(36)}`;
  } catch {
    idCounter = (idCounter + 1) >>> 0; // wrap at 2^32
    return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
  }
}

export function push(text: string, variant: ToastVariant = 'info', timeoutMs = 3000) {
  const id = makeId();
  const item: ToastItem = { id, text, variant, timeoutMs };
  items = [...items, item];
  emit();
  if (timeoutMs)
    setTimeout(() => {
      dismiss(id);
    }, timeoutMs);
}

export function dismiss(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}
