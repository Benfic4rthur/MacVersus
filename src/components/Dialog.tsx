"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Dialog({ open, title, onClose, children, wide = false }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = previous; };
    }
  }, [open]);

  return <dialog ref={ref} className={`dialog ${wide ? "dialog-wide" : ""}`} onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-label={title}>
    <div className="dialog-inner">
      <header className="dialog-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={20} /></button></header>
      {children}
    </div>
  </dialog>;
}
