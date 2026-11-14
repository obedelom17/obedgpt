import { useId } from 'react'
import { motion } from 'framer-motion'

// Onglets / sélecteur segmenté animé. items : [{id,label,icon}]
export function Seg({ items, value, onChange, label, className = '' }) {
  const uid = useId()
  return (
    <div className={`segmented ${className}`} role="group" aria-label={label}>
      {items.map(({ id, label: l, icon: Icon }) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
          {value === id && <motion.span layoutId={`seg-${uid}`} className="seg-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
          <span>{Icon && <Icon size={14} />} {l}</span>
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, hint, icon: Icon, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className="switch-row">
      {Icon && <span className="sw-ico"><Icon size={16} /></span>}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[.88rem] font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink3 mt-0.5">{hint}</span>}
      </span>
      <span className="switch" data-on={checked}><i /></span>
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      {children}
      {hint && <p className="text-xs text-ink3 mt-1.5">{hint}</p>}
    </div>
  )
}

export function Chip({ children, tone, onRemove, title }) {
  return <span className="fchip" data-tone={tone} title={title}>{children}{onRemove && <button type="button" onClick={onRemove} aria-label="Retirer">×</button>}</span>
}
