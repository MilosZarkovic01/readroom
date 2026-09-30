"use client";

import { useEffect, useState } from "react";

type ToastAction = { label: string; onClick: () => void };

type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  dismissLabel?: string;
  onDismiss?: () => void;
};

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function publish(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

function dismiss(id: number) {
  publish(items.filter((item) => item.id !== id));
}

export function notify(message: string) {
  const id = nextId++;
  publish([{ id, message }, ...items].slice(0, 3));
  window.setTimeout(() => dismiss(id), 5000);
}

export function confirmAction(message: string, confirmLabel = "Remove") {
  return new Promise<boolean>((resolve) => {
    const id = nextId++;
    let settled = false;
    const finish = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      dismiss(id);
      resolve(accepted);
    };
    publish([
      {
        id,
        message,
        action: { label: confirmLabel, onClick: () => finish(true) },
        dismissLabel: "Cancel",
        onDismiss: () => finish(false),
      },
      ...items,
    ]);
  });
}

export function AppToaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(items);

  useEffect(() => {
    const listener = () => setToasts([...items]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-[4.75rem] left-1/2 z-[70] w-full max-w-[430px] -translate-x-1/2 px-5 lg:top-6 lg:right-6 lg:left-auto lg:w-96 lg:max-w-none lg:translate-x-0 lg:px-0">
      <div className="pointer-events-auto flex w-full flex-col gap-2.5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.action ? "alertdialog" : "status"}
            className="notify-pop rounded-[1.35rem] bg-ivory/95 shadow-[0_18px_40px_rgba(45,33,27,0.14)] ring-1 ring-beige/80 backdrop-blur-sm"
          >
            <div className="relative px-4 py-3.5 pl-5">
              <span className="absolute inset-y-3 left-2.5 w-[3px] rounded-full bg-gradient-to-b from-terracotta to-dusty-peach" />
              <p className="text-[13px] leading-snug text-espresso">{toast.message}</p>
              {toast.action ? (
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-warm-gray"
                    onClick={toast.onDismiss}
                  >
                    {toast.dismissLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-deep-brown px-3 py-1.5 text-xs font-medium text-ivory"
                    onClick={toast.action.onClick}
                  >
                    {toast.action.label}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
