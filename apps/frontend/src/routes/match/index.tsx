import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button, Input, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import { useRawMatch } from '../../hooks/useRawData';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const Route = createFileRoute('/match/')({
  component: MatchRawPage,
});

interface MatchRawRow {
  key: string;
  field: string;
  value: unknown;
}

function isPayloadEmpty(payload: unknown): boolean {
  if (payload == null) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload === 'object')
    return Object.keys(payload as Record<string, unknown>).length === 0;
  return false;
}

function toTableRows(payload: unknown): MatchRawRow[] {
  if (payload == null) return [];

  if (Array.isArray(payload)) {
    return payload.map((value, index) => ({
      key: String(index),
      field: `[${index}]`,
      value,
    }));
  }

  if (typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).map(([field, value]) => ({
      key: field,
      field,
      value,
    }));
  }

  return [{ key: 'value', field: 'value', value: payload }];
}

function MatchRawPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [submitTerm, setSubmitTerm] = useState('');

  const { data, isLoading, error } = useRawMatch(submitTerm);

  const rows = useMemo(() => toTableRows(data), [data]);

  const columns: TableProps<MatchRawRow>['columns'] = [
    {
      title: 'Field',
      dataIndex: 'field',
      key: 'field',
      width: 240,
      render: (value: string) => <span className="font-medium text-slate-200">{value}</span>,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: unknown) => {
        if (value === null) return <span className="text-slate-500">null</span>;

        if (typeof value === 'object') {
          return (
            <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--bg-elevated)]/70 p-3 text-xs text-slate-100">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        }

        return <span className="text-slate-100">{String(value)}</span>;
      },
    },
  ];

  const handleSearch = (value: string) => {
    const term = value.trim();
    if (term) {
      setSubmitTerm(term);
    }
  };

  const hasSubmitted = submitTerm.trim().length > 0;
  const noResults = hasSubmitted && !isLoading && !error && isPayloadEmpty(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Match Raw Data"
        subtitle="View raw match data before materialized view processing."
      />

      <div className="mx-auto w-full max-w-5xl rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <Input.Search
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
          placeholder="Enter Match ID (e.g., NA1_4894375001)..."
          size="large"
          allowClear
          loading={isLoading}
          enterButton={
            <Button type="primary" loading={isLoading}>
              Search
            </Button>
          }
          className="w-full [&_.ant-input-group-addon]:!bg-transparent"
        />

        <div className="mt-6 min-h-[220px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          {!hasSubmitted && (
            <p className="text-sm text-text-secondary">
              Enter a Match ID to view raw data before materialized view processing
            </p>
          )}

          {isLoading && (
            <div className="flex h-[180px] items-center justify-center">
              <Spin size="large" />
            </div>
          )}

          {!isLoading && error && (
            <EmptyState
              title="Unable to load match data"
              description="Make sure the match exists in the database."
            />
          )}

          {noResults && (
            <EmptyState
              title="No raw match data found"
              description="No raw match data was found for this Match ID."
            />
          )}

          {hasSubmitted && !isLoading && !error && !noResults && (
            <Table
              columns={columns}
              dataSource={rows}
              pagination={false}
              size="small"
              bordered
              className="[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-surface)] [&_.ant-table-thead>tr>th]:!text-slate-300 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent"
            />
          )}
        </div>
      </div>
    </div>
  );
}
