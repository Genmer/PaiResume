import wyypLogo from '../../static/img/logo.png'

interface LogoMarkProps {
  className?: string
}

export function LogoMark({ className = 'h-10 w-10' }: LogoMarkProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-white shadow-[0_14px_28px_-18px_rgba(29,78,216,0.32)] ring-1 ring-primary-100/90 ${className}`}
      aria-hidden="true"
    >
      <img src={wyypLogo} alt="简历" className="h-full w-full rounded-full object-cover" />
    </div>
  )
}
