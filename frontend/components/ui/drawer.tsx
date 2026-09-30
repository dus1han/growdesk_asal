"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Sticky action bar at the bottom (Cancel / Save). */
  footer?: React.ReactNode;
}

/**
 * Side sheet for create/edit forms: slides in from the right on desktop, up from the bottom on
 * phones. Radix handles focus trapping, Escape, scroll locking and screen-reader semantics.
 */
export function Drawer({ open, onOpenChange, title, description, children, footer }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-surface shadow-pop focus:outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[460px] sm:rounded-none sm:rounded-l-3xl"
                initial={{ opacity: 0, x: 0, y: 40 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                  <div>
                    <Dialog.Title className="font-display text-lg font-bold tracking-tight">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <X className="size-[18px]" />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
