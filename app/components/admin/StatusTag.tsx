export function StatusTag({ status }: { status: string }) {
  return <span className={`gb-tag gb-tag-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}
