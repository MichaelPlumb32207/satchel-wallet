'use client';

/** Small shared primitives — keep the wallet visually coherent. */

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const styles = {
    primary:
      'bg-accent text-accent-contrast font-semibold hover:bg-accent-strong disabled:opacity-40',
    secondary:
      'border border-neutral-700 text-neutral-200 hover:border-neutral-500 disabled:opacity-40',
    ghost: 'text-neutral-400 hover:text-neutral-200 disabled:opacity-40',
    danger: 'bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-40',
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-3 text-sm transition disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Input({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-accent ${className}`}
    />
  );
}

export function TextArea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-accent ${className}`}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-neutral-400">{children}</label>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-400">{children}</p>;
}

export function PageTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 mt-2">
      <h1 className="text-xl font-bold tracking-tight">{children}</h1>
      {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
    </div>
  );
}
