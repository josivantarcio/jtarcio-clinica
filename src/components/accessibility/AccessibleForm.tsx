import React, { useState, useId } from 'react';

/**
 * ♿ COMPONENTES ACESSÍVEIS - EO CLÍNICA
 * 
 * Componentes baseados nos testes de acessibilidade WCAG 2.1
 */

interface AccessibleInputProps {
  label: string;
  type?: string;
  required?: boolean;
  description?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function AccessibleInput({
  label,
  type = 'text',
  required = false,
  description,
  error,
  value,
  onChange,
  placeholder,
  autoComplete
}: AccessibleInputProps) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();

  return (
    <div className="accessible-input-container">
      <label 
        htmlFor={inputId}
        className={`accessible-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span className="required-indicator" aria-label="campo obrigatório">
            {' *'}
          </span>
        )}
      </label>

      {description && (
        <div 
          id={descriptionId}
          className="field-description"
          role="note"
        >
          {description}
        </div>
      )}

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={[
          description ? descriptionId : null,
          error ? errorId : null
        ].filter(Boolean).join(' ') || undefined}
        className={`accessible-input ${error ? 'error' : ''}`}
        // Tamanho mínimo touch-friendly (44px altura)
        style={{ minHeight: '44px', fontSize: '16px' }}
      />

      {error && (
        <div 
          id={errorId}
          className="field-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  description?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function AccessibleSelect({
  label,
  options,
  required = false,
  description,
  error,
  value,
  onChange
}: AccessibleSelectProps) {
  const selectId = useId();
  const descriptionId = useId();
  const errorId = useId();

  return (
    <div className="accessible-select-container">
      <label 
        htmlFor={selectId}
        className={`accessible-label ${required ? 'required' : ''}`}
      >
        {label}
        {required && (
          <span className="required-indicator" aria-label="campo obrigatório">
            {' *'}
          </span>
        )}
      </label>

      {description && (
        <div 
          id={descriptionId}
          className="field-description"
          role="note"
        >
          {description}
        </div>
      )}

      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={[
          description ? descriptionId : null,
          error ? errorId : null
        ].filter(Boolean).join(' ') || undefined}
        className={`accessible-select ${error ? 'error' : ''}`}
        // Tamanho mínimo touch-friendly
        style={{ minHeight: '44px', fontSize: '16px' }}
      >
        <option value="">Selecione uma opção</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <div 
          id={errorId}
          className="field-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface AccessibleButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export function AccessibleButton({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
  ariaLabel,
  ariaDescribedBy
}: AccessibleButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={`accessible-button accessible-button--${variant} ${loading ? 'loading' : ''}`}
      // Tamanho mínimo touch-friendly
      style={{ 
        minHeight: '44px', 
        minWidth: '44px',
        fontSize: '16px',
        padding: '12px 24px'
      }}
    >
      {loading ? (
        <>
          <span className="loading-spinner" aria-hidden="true" />
          <span className="sr-only">Carregando...</span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface AccessibleAlertProps {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function AccessibleAlert({
  type,
  title,
  message,
  onClose,
  autoClose = false,
  duration = 5000
}: AccessibleAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, isVisible, onClose]);

  if (!isVisible) return null;

  const roleMap = {
    error: 'alert',
    warning: 'alert',
    success: 'status',
    info: 'status'
  };

  const ariaLiveMap = {
    error: 'assertive',
    warning: 'assertive',
    success: 'polite',
    info: 'polite'
  };

  return (
    <div
      role={roleMap[type]}
      aria-live={ariaLiveMap[type] as 'assertive' | 'polite'}
      className={`accessible-alert accessible-alert--${type}`}
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
    >
      <div className="alert-content">
        <h3 id="alert-title" className="alert-title">
          {title}
        </h3>
        <p id="alert-message" className="alert-message">
          {message}
        </p>
      </div>
      
      {onClose && (
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          aria-label={`Fechar alerta: ${title}`}
          className="alert-close-button"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </div>
  );
}

// Componente para Skip Links (pular para conteúdo principal)
export function SkipLink({ href = '#main-content', children = 'Pular para o conteúdo principal' }) {
  return (
    <a
      href={href}
      className="skip-link"
      // Estilo inline para garantir visibilidade quando focado
      style={{
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: '#000',
        color: '#fff',
        padding: '8px',
        textDecoration: 'none',
        zIndex: 9999,
        fontSize: '14px',
        borderRadius: '4px'
      }}
      onFocus={(e) => {
        (e.target as HTMLElement).style.top = '6px';
      }}
      onBlur={(e) => {
        (e.target as HTMLElement).style.top = '-40px';
      }}
    >
      {children}
    </a>
  );
}

// Componente para Live Region (anúncios dinâmicos)
interface LiveRegionProps {
  message: string;
  type: 'polite' | 'assertive';
  clearAfter?: number;
}

export function LiveRegion({ message, type, clearAfter = 3000 }: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  React.useEffect(() => {
    setCurrentMessage(message);
    
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      aria-live={type}
      aria-atomic="true"
      className="sr-only" // Screen reader only
    >
      {currentMessage}
    </div>
  );
}