export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-2 grid gap-1 md:mb-4">
      <h1 className="text-[26px] leading-tight font-bold md:text-[32px]">{title}</h1>
      {description && <p className="text-sm text-muted-foreground md:text-[15px]">{description}</p>}
    </header>
  );
}
