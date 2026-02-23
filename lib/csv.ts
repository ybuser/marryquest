export function toCsv(rows: string[][]): string {
  return rows
    .map((columns) =>
      columns
        .map((value) => {
          const safe = value ?? '';
          if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
            return `"${safe.replace(/"/g, '""')}"`;
          }
          return safe;
        })
        .join(',')
    )
    .join('\n');
}

export function withBom(content: string): string {
  return `\uFEFF${content}`;
}

export function maskKey(value: string | null | undefined): string {
  if (!value) return '';
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
