import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/* ---------------- 토스트 ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((v) => [...v, { id, message, tone }]);
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'bad' ? 'bad' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- 모달 ---------------- */
export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={onClose}>
            닫기
          </button>
        </div>
        {children}
        {footer && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- 폼 필드 ---------------- */
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/* ---------------- 도장 ---------------- */
export function StampButton({ kind, active, onClick, disabled }) {
  const [hit, setHit] = useState(false);
  const label = kind === 'high' ? '상' : '하';
  return (
    <button
      type="button"
      className={`stamp ${kind} ${active ? 'on' : ''} ${hit ? 'hit' : ''}`}
      aria-pressed={active}
      aria-label={`${label} 도장`}
      disabled={disabled}
      onClick={() => {
        setHit(true);
        setTimeout(() => setHit(false), 340);
        onClick?.();
      }}
    >
      {label}
    </button>
  );
}

export function StampMini({ stamp }) {
  const kind = stamp === 'high' ? 'high' : stamp === 'low' ? 'low' : 'none';
  const label = stamp === 'high' ? '상' : stamp === 'low' ? '하' : '·';
  return (
    <span className={`stamp-mini ${kind}`} title={stamp ? `${label} 도장` : '미채점'}>
      {label}
    </span>
  );
}

export const Spinner = () => <span className="spinner" aria-hidden="true" />;

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
