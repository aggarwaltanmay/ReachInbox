import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Email, EmailStats, Tab } from '../types';

export function useEmails(tab: Tab, enabled: boolean) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<EmailStats>({ scheduled: 0, processing: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    if (!hasLoaded.current) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [list, nextStats] = await Promise.all([api.emails(), api.stats()]);
      setEmails(list);
      setStats(nextStats);
      setLastUpdated(new Date());
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load emails');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, tab]);

  const search = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        await load();
        return;
      }
      setSearching(true);
      setError('');
      try {
        setEmails(await api.searchEmails(query.trim()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled || searchQuery || !autoRefresh) return;
    const interval = window.setInterval(load, tab === 'scheduled' ? 5000 : 15000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, enabled, load, searchQuery, tab]);

  const visible = emails.filter((email) =>
    tab === 'sent' ? ['sent', 'failed'].includes(email.status) : !['sent', 'failed'].includes(email.status)
  );

  return {
    emails: visible,
    stats,
    loading,
    searching,
    refreshing,
    searchQuery,
    lastUpdated,
    autoRefresh,
    error,
    load,
    search,
    setAutoRefresh
  };
}
