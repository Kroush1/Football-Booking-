import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}
