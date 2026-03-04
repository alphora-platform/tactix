import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  TableIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  title: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render: (value: T[keyof T], record: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableCardProps<T extends Record<string, any>> {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  loading?: boolean;
  emptyText?: string;
  /** Enables the internal search box (client-side filtering by all string values) */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Called on every keystroke when provided — for server-side search */
  onSearch?: (query: string) => void;
  /** Slot rendered right-aligned beside the search box */
  actions?: React.ReactNode;
  onRowClick?: (record: T) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
  className?: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border/30">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div
                className="skeleton h-3.5 rounded-full"
                style={{ width: `${45 + ((rowIdx * 13 + colIdx * 17) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  // Build page number array with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [];
    pages.push(1);
    if (page > 4) pages.push('…');
    for (let p = Math.max(2, page - 2); p <= Math.min(totalPages - 1, page + 2); p++) {
      pages.push(p);
    }
    if (page < totalPages - 3) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const btnBase =
    'flex items-center justify-center h-7 min-w-[28px] px-1.5 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold';

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border">
      <p className="text-xs text-text-secondary tabular-nums shrink-0">
        {total === 0 ? '0 results' : `${from}–${to} of ${total}`}
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            btnBase,
            page <= 1
              ? 'text-text-secondary/40 cursor-not-allowed'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          )}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="text-text-secondary px-1 text-xs select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btnBase,
                p === page
                  ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(
            btnBase,
            page >= totalPages
              ? 'text-text-secondary/40 cursor-not-allowed'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          )}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── DataTableCard ─────────────────────────────────────────────────────────────

export function DataTableCard<T extends Record<string, any>>({
  title,
  subtitle,
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = 'No data to display',
  searchable = false,
  searchPlaceholder = 'Search…',
  onSearch,
  actions,
  onRowClick,
  pagination,
  className,
}: DataTableCardProps<T>) {
  const [internalQuery, setInternalQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Search handler ───────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (q: string) => {
      setInternalQuery(q);
      onSearch?.(q);
    },
    [onSearch]
  );

  // ── Sort handler ─────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  // ── Client-side filter + sort (only when no external onSearch) ─────────
  const processedData = useMemo(() => {
    let rows = [...data];

    // Filter by internalQuery when no server-side handler
    if (!onSearch && internalQuery.trim()) {
      const q = internalQuery.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
      );
    }

    // Sort
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey as keyof T];
        const bv = b[sortKey as keyof T];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [data, internalQuery, onSearch, sortKey, sortDir]);

  const isEmpty = !loading && processedData.length === 0;

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div
      className={cn(
        'bg-bg-card border border-border rounded-xl shadow-card overflow-hidden',
        className
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Title block */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary leading-snug">{title}</h3>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-2 sm:shrink-0">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-3.5 h-3.5 pointer-events-none" />
              <input
                type="text"
                value={internalQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-44 sm:w-52 bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-gold transition-colors"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* Head */}
          <thead className="bg-bg-elevated">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap border-b border-border/50',
                      col.align ? alignClass[col.align] : 'text-left',
                      col.sortable &&
                        'cursor-pointer select-none hover:text-text-primary transition-colors'
                    )}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    aria-sort={
                      col.sortable
                        ? isSorted
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.title}
                      {col.sortable && (
                        <span className="text-text-secondary/60">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp size={12} strokeWidth={2.5} />
                            ) : (
                              <ArrowDown size={12} strokeWidth={2.5} />
                            )
                          ) : (
                            <ArrowUpDown size={12} strokeWidth={2} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border/30">
            {loading ? (
              <SkeletonRows cols={columns.length} />
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <TableIcon
                      size={36}
                      className="text-text-secondary opacity-25"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm text-text-secondary">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              processedData.map((record) => (
                <tr
                  key={String(record[rowKey])}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                  className={cn(
                    'hover:bg-bg-elevated/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-text-primary',
                        col.align ? alignClass[col.align] : 'text-left'
                      )}
                    >
                      {col.render(record[col.key as keyof T], record)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {pagination && !loading && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onChange={pagination.onChange}
        />
      )}
    </div>
  );
}
