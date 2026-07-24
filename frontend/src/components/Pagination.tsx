interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}

const WINDOW_SIZE = 5;

export function Pagination({ page, pages, total, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  const half = Math.floor(WINDOW_SIZE / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(pages, start + WINDOW_SIZE - 1);
  start = Math.max(1, end - WINDOW_SIZE + 1);
  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="pagination" aria-label="Paginacion de resultados">
      <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </button>

      {start > 1 && <span className="pagination-ellipsis">…</span>}
      {pageNumbers.map((n) => (
        <button
          key={n}
          type="button"
          className={n === page ? 'page-number active' : 'page-number'}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onPageChange(n)}
        >
          {n}
        </button>
      ))}
      {end < pages && <span className="pagination-ellipsis">…</span>}

      <button
        type="button"
        className="btn btn-ghost"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>

      <span className="pagination-total">{total} en total</span>
    </nav>
  );
}
