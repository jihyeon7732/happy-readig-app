import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/* ---------------- 토스트 ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    const ms = tone === 'alert' ? 6000 : 2600;
    setItems((v) => [...v, { id, message, tone }]);
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone !== 'ok' ? t.tone : ''}`}>
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

/* ---------------- 트로피 ---------------- */
export function Trophy({ size = 20, className = '' }) {
  return (
    <svg
      className={`trophy-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe58a" />
          <stop offset="55%" stopColor="#e8b93f" />
          <stop offset="100%" stopColor="#b8892b" />
        </linearGradient>
      </defs>
      <path
        d="M14 6h20v11c0 6.1-4.5 10.6-10 11.4C18.5 27.6 14 23.1 14 17V6z"
        fill="url(#trophyGold)"
        stroke="#8a651e"
        strokeWidth="1.2"
      />
      <path
        d="M14 9H7.5C7 14.5 9.7 18.6 14 19.8"
        fill="none"
        stroke="#b8892b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M34 9h6.5c.5 5.5-2.2 9.6-6.5 10.8"
        fill="none"
        stroke="#b8892b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="21.5" y="28" width="5" height="7" fill="#b8892b" />
      <path d="M15 40c0-3 4-4.6 9-4.6s9 1.6 9 4.6v1.4H15V40z" fill="#8a651e" />
      <rect x="14" y="35.6" width="20" height="3" rx="1.5" fill="#e8b93f" />
    </svg>
  );
}

/* ---------------- 손들기 아이콘 ---------------- */
export function Hand({ size = 20, className = '' }) {
  return (
    <svg
      className={`hand-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 12.2V5.5a1.5 1.5 0 0 1 3 0V11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 11V4.2a1.5 1.5 0 0 1 3 0V11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15 11.2V6.3a1.5 1.5 0 0 1 3 0V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 13.5V9.8a1.5 1.5 0 0 1 3 0v5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6 14c0 4.4 2.7 7.5 7 7.5s6-3.3 6-7.5v-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

/* ---------------- 하단 크레딧 ---------------- */
export function Footer() {
  return <footer className="site-footer">교사 김지현에 의해 제작됨</footer>;
}
