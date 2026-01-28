import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { DiscoveredPackage } from '../types/package.js';
import { formatRelativeDate, formatDownloads } from '../utils/format.js';

export interface PackageListProps {
  packages: DiscoveredPackage[];
  selectedPackages: Set<string>;
  plannedPackages: Set<string>;
  onSelect: (pkg: DiscoveredPackage) => void;
  onToggle: (pkgName: string) => void;
  onAction: (pkg: DiscoveredPackage) => void;
  onViewPlan: () => void;
  hasPlan: boolean;
}

type SortKey = 'name' | 'lastPublish' | 'downloads';
type SortOrder = 'asc' | 'desc';

export function PackageList({
  packages,
  selectedPackages,
  plannedPackages,
  onSelect,
  onToggle,
  onAction,
  onViewPlan,
  hasPlan,
}: PackageListProps) {
  const [cursor, setCursor] = useState(0);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastPublish');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFilter, setShowFilter] = useState(false);

  const filteredPackages = useMemo(() => {
    let result = packages;

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter((pkg) => pkg.name.toLowerCase().includes(lowerFilter));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'lastPublish':
          cmp = a.lastPublish.getTime() - b.lastPublish.getTime();
          break;
        case 'downloads':
          cmp = (a.downloadsWeekly ?? 0) - (b.downloadsWeekly ?? 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [packages, filter, sortKey, sortOrder]);

  useInput((input, key) => {
    if (showFilter) {
      if (key.escape || key.return) {
        setShowFilter(false);
      } else if (key.backspace || key.delete) {
        setFilter((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFilter((prev) => prev + input);
      }
      return;
    }

    if (input === 'j' || key.downArrow) {
      setCursor((prev) => Math.min(prev + 1, filteredPackages.length - 1));
    } else if (input === 'k' || key.upArrow) {
      setCursor((prev) => Math.max(prev - 1, 0));
    } else if (input === ' ') {
      const pkg = filteredPackages[cursor];
      if (pkg) {
        onToggle(pkg.name);
      }
    } else if (key.return) {
      const pkg = filteredPackages[cursor];
      if (pkg) {
        onSelect(pkg);
      }
    } else if (input === 'a') {
      const pkg = filteredPackages[cursor];
      if (pkg) {
        onAction(pkg);
      }
    } else if (input === 'p' && hasPlan) {
      onViewPlan();
    } else if (input === '/') {
      setShowFilter(true);
    } else if (input === 's') {
      const keys: SortKey[] = ['name', 'lastPublish', 'downloads'];
      const currentIndex = keys.indexOf(sortKey);
      setSortKey(keys[(currentIndex + 1) % keys.length]!);
    } else if (input === 'o') {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }
  });

  const visibleStart = Math.max(0, cursor - 10);
  const visibleEnd = Math.min(filteredPackages.length, visibleStart + 20);
  const visiblePackages = filteredPackages.slice(visibleStart, visibleEnd);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          {filteredPackages.length} packages
          {filter && <Text color="yellow"> (filtered: "{filter}")</Text>}
          <Text color="gray"> • Sort: {sortKey} {sortOrder === 'asc' ? '↑' : '↓'}</Text>
        </Text>
      </Box>

      {showFilter && (
        <Box marginBottom={1}>
          <Text>Filter: </Text>
          <Text color="cyan">{filter}</Text>
          <Text color="gray">█</Text>
        </Box>
      )}

      <Box flexDirection="column">
        <Box>
          <Box width={3}><Text color="gray"> </Text></Box>
          <Box width={36}><Text color="gray">NAME</Text></Box>
          <Box width={15}><Text color="gray">LAST PUBLISH</Text></Box>
          <Box width={10}><Text color="gray">DL/WK</Text></Box>
          <Box width={12}><Text color="gray">STATUS</Text></Box>
        </Box>

        {visiblePackages.map((pkg, index) => {
          const actualIndex = visibleStart + index;
          const isCursor = actualIndex === cursor;
          const isSelected = selectedPackages.has(pkg.name);
          const isPlanned = plannedPackages.has(pkg.name);

          const status = pkg.deprecated ? 'deprecated' : isPlanned ? 'planned' : 'active';
          const statusColor = pkg.deprecated ? 'yellow' : isPlanned ? 'magenta' : 'green';

          return (
            <Box key={pkg.name} backgroundColor={isCursor ? 'blue' : undefined}>
              <Box width={3}>
                <Text color={isCursor ? 'white' : undefined}>
                  {isSelected ? '●' : '○'}{' '}
                </Text>
              </Box>
              <Box width={36}>
                <Text
                  color={isCursor ? 'white' : isPlanned ? 'magenta' : pkg.deprecated ? 'yellow' : 'cyan'}
                >
                  {pkg.name.slice(0, 35)}
                </Text>
              </Box>
              <Box width={15}>
                <Text color={isCursor ? 'white' : 'gray'}>
                  {formatRelativeDate(pkg.lastPublish)}
                </Text>
              </Box>
              <Box width={10}>
                <Text color={isCursor ? 'white' : 'gray'}>
                  {pkg.downloadsWeekly !== undefined ? formatDownloads(pkg.downloadsWeekly) : '-'}
                </Text>
              </Box>
              <Box width={12}>
                <Text color={isCursor ? 'white' : statusColor}>{status}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {filteredPackages.length > 20 && (
        <Box marginTop={1}>
          <Text color="gray">
            Showing {visibleStart + 1}-{visibleEnd} of {filteredPackages.length}
          </Text>
        </Box>
      )}
    </Box>
  );
}
