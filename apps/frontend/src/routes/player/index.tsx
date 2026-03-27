import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { Input, Select, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { Search } from 'lucide-react';
import { useRawPlayers, type PlayerListItem } from '../../hooks/useRawData';
import { PageHeader } from '@/components/ui/PageHeader';

export const Route = createFileRoute('/player/')({
  component: PlayerListPage,
});

const REGION_OPTIONS = [
  { label: 'All Regions', value: '' },
  { label: 'NA1', value: 'na1' },
  { label: 'EUW1', value: 'euw1' },
  { label: 'EUN1', value: 'eun1' },
  { label: 'KR', value: 'kr' },
  { label: 'BR1', value: 'br1' },
  { label: 'LA1', value: 'la1' },
  { label: 'LA2', value: 'la2' },
  { label: 'OC1', value: 'oc1' },
  { label: 'TR1', value: 'tr1' },
  { label: 'RU', value: 'ru' },
  { label: 'JP1', value: 'jp1' },
  { label: 'SG2', value: 'sg2' },
  { label: 'TW2', value: 'tw2' },
  { label: 'VN2', value: 'vn2' },
];

const TIER_OPTIONS = [
  { label: 'All Tiers', value: '' },
  { label: 'Challenger', value: 'CHALLENGER' },
  { label: 'Grandmaster', value: 'GRANDMASTER' },
  { label: 'Master', value: 'MASTER' },
  { label: 'Diamond', value: 'DIAMOND' },
  { label: 'Emerald', value: 'EMERALD' },
  { label: 'Platinum', value: 'PLATINUM' },
  { label: 'Gold', value: 'GOLD' },
  { label: 'Silver', value: 'SILVER' },
  { label: 'Bronze', value: 'BRONZE' },
  { label: 'Iron', value: 'IRON' },
];

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: '#f59e0b',
  GRANDMASTER: '#ef4444',
  MASTER: '#8b5cf6',
  DIAMOND: '#06b6d4',
  EMERALD: '#10b981',
  PLATINUM: '#3b82f6',
  GOLD: '#f59e0b',
  SILVER: '#94a3b8',
  BRONZE: '#d97706',
  IRON: '#6b7280',
};

const PAGE_SIZE = 20;

function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return '—';
  return `${Math.round((wins / total) * 100)}%`;
}

const columns: TableProps<PlayerListItem>['columns'] = [
  {
    title: 'Summoner Name',
    dataIndex: 'summonerName',
    key: 'summonerName',
    render: (v: string | null) => (
      <span className="font-medium text-slate-100">
        {v ?? <span className="text-slate-500">—</span>}
      </span>
    ),
  },
  {
    title: 'Region',
    dataIndex: 'region',
    key: 'region',
    width: 90,
    render: (v: string) => (
      <span className="font-chakra text-xs uppercase tracking-wider text-slate-300">{v}</span>
    ),
  },
  {
    title: 'Tier',
    dataIndex: 'tier',
    key: 'tier',
    width: 140,
    render: (tier: string | null, row) => {
      if (!tier) return <span className="text-slate-500">—</span>;
      const color = TIER_COLORS[tier] ?? '#94a3b8';
      return (
        <Tag
          style={{ color, borderColor: `${color}40`, background: `${color}15` }}
          className="font-chakra text-xs font-semibold tracking-widest"
        >
          {tier} {row.lp != null ? `${row.lp} LP` : ''}
        </Tag>
      );
    },
  },
  {
    title: 'W / L',
    key: 'wl',
    width: 100,
    render: (_, row) => (
      <span className="font-chakra text-sm text-slate-300">
        <span className="text-emerald-400">{row.wins}W</span>
        {' / '}
        <span className="text-rose-400">{row.losses}L</span>
      </span>
    ),
  },
  {
    title: 'Win Rate',
    key: 'winRate',
    width: 90,
    render: (_, row) => (
      <span className="font-chakra font-semibold text-slate-200">
        {winRate(row.wins, row.losses)}
      </span>
    ),
  },
  {
    title: 'Updated',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
    render: (v: string) => (
      <span className="font-chakra text-xs text-slate-400">
        {new Date(v).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    ),
  },
];

function PlayerListPage() {
  const [nameInput, setNameInput] = useState('');
  const [filters, setFilters] = useState<{
    name: string;
    region: string;
    tier: string;
    page: number;
  }>({ name: '', region: '', tier: '', page: 1 });

  const { data, isFetching } = useRawPlayers({
    page: filters.page,
    limit: PAGE_SIZE,
    region: filters.region || undefined,
    name: filters.name || undefined,
    tier: filters.tier || undefined,
  });

  const applySearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, name: nameInput.trim(), page: 1 }));
  }, [nameInput]);

  const handleRegionChange = (value: string) => {
    setFilters((prev) => ({ ...prev, region: value, page: 1 }));
  };

  const handleTierChange = (value: string) => {
    setFilters((prev) => ({ ...prev, tier: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Players" subtitle="Browse all players tracked in the database." />

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        {/* Filters */}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
        >
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Search summoner name..."
            allowClear
            onClear={() => {
              setNameInput('');
              setFilters((prev) => ({ ...prev, name: '', page: 1 }));
            }}
            prefix={<Search size={15} className="text-slate-400" />}
            className="flex-1 [&.ant-input-affix-wrapper]:!rounded-xl [&.ant-input-affix-wrapper]:!border-[var(--border-default)] [&.ant-input-affix-wrapper]:!bg-[var(--bg-elevated)] [&_.ant-input]:!text-slate-100 [&_.ant-input::placeholder]:!text-slate-400"
          />
          <Select
            value={filters.region}
            options={REGION_OPTIONS}
            onChange={handleRegionChange}
            className="w-full sm:w-[160px] [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-[var(--border-default)] [&_.ant-select-selector]:!bg-[var(--bg-elevated)] [&_.ant-select-selection-item]:!text-slate-100"
          />
          <Select
            value={filters.tier}
            options={TIER_OPTIONS}
            onChange={handleTierChange}
            className="w-full sm:w-[160px] [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-[var(--border-default)] [&_.ant-select-selector]:!bg-[var(--bg-elevated)] [&_.ant-select-selection-item]:!text-slate-100"
          />
        </form>

        {/* Table */}
        <div className="mt-5">
          <Table<PlayerListItem>
            rowKey="puuid"
            columns={columns}
            dataSource={data?.data ?? []}
            loading={isFetching}
            pagination={{
              current: filters.page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              showTotal: (total) => (
                <span className="text-slate-400 text-sm">{total.toLocaleString()} players</span>
              ),
              onChange: handlePageChange,
              showSizeChanger: false,
            }}
            size="middle"
            className="[&_.ant-table]:!bg-transparent [&_.ant-table-container]:!border-[var(--border-default)] [&_.ant-table-thead>tr>th]:!border-[var(--border-subtle)] [&_.ant-table-thead>tr>th]:!bg-[var(--bg-elevated)] [&_.ant-table-thead>tr>th]:!text-slate-400 [&_.ant-table-tbody>tr>td]:!border-[var(--border-subtle)] [&_.ant-table-tbody>tr>td]:!bg-transparent [&_.ant-table-tbody>tr:hover>td]:!bg-[var(--bg-elevated)]/60 [&_.ant-pagination-item-active]:!border-[var(--accent-primary)] [&_.ant-pagination-item-active_a]:!text-[var(--accent-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
