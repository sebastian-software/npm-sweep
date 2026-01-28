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
          <Text color="gray">
            {'   '}
            {'NAME'.padEnd(35)}
            {'LAST PUBLISH'.padEnd(15)}
            {'DL/WK'.padEnd(10)}
            {'STATUS'}
          </Text>
        </Box>

        {visiblePackages.map((pkg, index) => {
          const actualIndex = visibleStart + index;
          const isCursor = actualIndex === cursor;
          const isSelected = selectedPackages.has(pkg.name);
          const isPlanned = plannedPackages.has(pkg.name);

          return (
            <Box key={pkg.name}>
              <Text
                backgroundColor={isCursor ? 'blue' : undefined}
                color={isCursor ? 'white' : undefined}
              >
                {isSelected ? '●' : '○'}{' '}
                <Text color={isPlanned ? 'magenta' : pkg.deprecated ? 'yellow' : undefined}>
                  {pkg.name.padEnd(35).slice(0, 35)}
                </Text>
                <Text color="gray">{formatRelativeDate(pkg.lastPublish).padEnd(15)}</Text>
                <Text color="gray">
                  {(pkg.downloadsWeekly !== undefined
                    ? formatDownloads(pkg.downloadsWeekly)
                    : '-'
                  ).padEnd(10)}
                </Text>
                {pkg.deprecated && <Text color="yellow">deprecated</Text>}
                {isPlanned && <Text color="magenta">planned</Text>}
              </Text>
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
