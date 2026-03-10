import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button, Input, Select, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import { Search } from 'lucide-react';
import { useRawPlayerByName, useRawPlayerByPuuid } from '../../hooks/useRawData';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export const Route = createFileRoute('/player/')({
  component: PlayerRawPage,
});

type SearchType = 'name' | 'puuid' | 'riotId';

interface PlayerRawRow {
  key: string;
  field: string;
  value: unknown;
}

const SEARCH_TYPE_OPTIONS: { label: string; value: SearchType }[] = [
  { label: 'Summoner Name', value: 'name' },
  { label: 'PUUID', value: 'puuid' },
  { label: 'Riot ID', value: 'riotId' },
];

function isPayloadEmpty(payload: unknown): boolean {
  if (payload == null) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload === 'object') return Object.keys(payload as Record<string, unknown>).length === 0;
  return false;
}

function toTableRows(payload: unknown): PlayerRawRow[] {
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

function PlayerRawPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [submitTerm, setSubmitTerm] = useState('');

  // Preserve existing API behavior: name-based query handles both Summoner Name and Riot ID.
  const queryMode = searchType === 'puuid' ? 'puuid' : 'name';

  const byNameQuery = useRawPlayerByName(queryMode === 'name' ? submitTerm : '');
  const byPuuidQuery = useRawPlayerByPuuid(queryMode === 'puuid' ? submitTerm : '');

  const data = queryMode === 'name' ? byNameQuery.data : byPuuidQuery.data;
  const isLoading = queryMode === 'name' ? byNameQuery.isLoading : byPuuidQuery.isLoading;
  const error = queryMode === 'name' ? byNameQuery.error : byPuuidQuery.error;
  const rows = useMemo(() => toTableRows(data), [data]);

  const columns: TableProps<PlayerRawRow>['columns'] = [
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

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSubmitTerm(searchTerm.trim());
    }
  };

  const hasSubmitted = submitTerm.trim().length > 0;
  const noResults = hasSubmitted && !isLoading && !error && isPayloadEmpty(data);

  const placeholder =
    searchType === 'name'
      ? 'Enter summoner name...'
      : searchType === 'puuid'
        ? 'Enter PUUID...'
        : 'Enter Riot ID...';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Player Raw Data"
        subtitle="View raw player data before materialized view processing."
      />

      <div className="mx-auto w-full max-w-5xl rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Select
            value={searchType}
            options={SEARCH_TYPE_OPTIONS}
            size="large"
            onChange={(value) => setSearchType(value)}
            className="w-full sm:w-[220px] [&_.ant-select-selector]:!h-[40px] [&_.ant-select-selector]:!items-center [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-[var(--border-default)] [&_.ant-select-selector]:!bg-[var(--bg-elevated)] [&_.ant-select-selection-item]:!text-slate-100"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            size="large"
            allowClear
            prefix={<Search size={16} className="text-slate-400" />}
            className="flex-1 [&.ant-input-affix-wrapper]:!rounded-xl [&.ant-input-affix-wrapper]:!border-[var(--border-default)] [&.ant-input-affix-wrapper]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400"
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            disabled={!searchTerm.trim()}
            size="large"
            className="sm:min-w-[112px]"
          >
            Search
          </Button>
        </form>

        <div className="mt-6 min-h-[220px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          {!hasSubmitted && (
            <p className="text-sm text-text-secondary">
              Enter a player identifier to view raw data before materialized view processing
            </p>
          )}

          {isLoading && (
            <div className="flex h-[180px] items-center justify-center">
              <Spin size="large" />
            </div>
          )}

          {!isLoading && error && (
            <EmptyState
              title="Unable to load player data"
              description="Make sure the player exists in the database."
            />
          )}

          {noResults && (
            <EmptyState
              title="No raw player data found"
              description="No raw player data was found for this search term."
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
