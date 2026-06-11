import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { DraggableWidgetWrapper } from 'aideon/canvas/draggable-widget-wrapper';

describe('DraggableWidgetWrapper', () => {
  const originalSetPointerCapture = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'setPointerCapture',
  )?.value as ((this: HTMLElement, pointerId: number) => void) | undefined;
  const originalReleasePointerCapture = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'releasePointerCapture',
  )?.value as ((this: HTMLElement, pointerId: number) => void) | undefined;

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterAll(() => {
    const proto = HTMLElement.prototype as {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
    };

    if (originalSetPointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
        configurable: true,
        value: originalSetPointerCapture,
      });
    } else {
      delete proto.setPointerCapture;
    }

    if (originalReleasePointerCapture) {
      Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
        configurable: true,
        value: originalReleasePointerCapture,
      });
    } else {
      delete proto.releasePointerCapture;
    }
  });

  it('drags using the grab handle and reports the final position', async () => {
    const onDragEnd = vi.fn();

    const { container } = render(
      <DraggableWidgetWrapper id="widget-1" x={10} y={20} scale={1} onDragEnd={onDragEnd}>
        <button type="button" className="cursor-grab">
          Drag
        </button>
      </DraggableWidgetWrapper>,
    );

    const wrapper = container.firstChild as HTMLElement;

    fireEvent.pointerDown(screen.getByText('Drag'), {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(wrapper, {
      pointerId: 1,
      clientX: 130,
      clientY: 120,
    });
    fireEvent.pointerUp(wrapper, {
      pointerId: 1,
      clientX: 130,
      clientY: 120,
    });

    await waitFor(() => {
      expect(onDragEnd).toHaveBeenCalledWith('widget-1', 40, 40);
    });
  });

  it('resizes using the handle and reports the final size', async () => {
    const onResizeEnd = vi.fn();

    const { container } = render(
      <DraggableWidgetWrapper
        id="widget-2"
        x={0}
        y={0}
        width={400}
        height={400}
        scale={1}
        onDragEnd={vi.fn()}
        onResizeEnd={onResizeEnd}
      >
        <div>Widget</div>
      </DraggableWidgetWrapper>,
    );

    const wrapper = container.firstChild as HTMLElement;
    const resizeHandle = container.querySelector('.resize-handle');
    expect(resizeHandle).not.toBeNull();

    fireEvent.pointerDown(resizeHandle as HTMLElement, {
      pointerId: 2,
      clientX: 50,
      clientY: 50,
    });
    fireEvent.pointerMove(wrapper, {
      pointerId: 2,
      clientX: 80,
      clientY: 100,
    });
    fireEvent.pointerUp(wrapper, {
      pointerId: 2,
      clientX: 80,
      clientY: 100,
    });

    await waitFor(() => {
      expect(onResizeEnd).toHaveBeenCalledWith('widget-2', 430, 450);
    });
  });
});
