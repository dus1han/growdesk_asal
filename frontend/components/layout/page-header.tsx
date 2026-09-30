interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Title with the page's main actions on the right. On phones the actions stay beside the title
 * and the description runs full width underneath; from sm up the actions line up with the
 * description's baseline, as before.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
      <h1 className="col-start-1 row-start-1 font-display text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
      {actions && (
        <div className="col-start-2 row-start-1 flex flex-wrap items-center justify-end gap-2 sm:row-span-2 sm:self-end">{actions}</div>
      )}
      {description && <p className="col-span-2 row-start-2 text-sm text-muted sm:col-span-1">{description}</p>}
    </div>
  );
}
