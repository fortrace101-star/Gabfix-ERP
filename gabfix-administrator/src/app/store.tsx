import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import type { AppData, Modal, View, WorkspaceProfile } from '../types';
import { useTheme } from '../hooks/useTheme';
import { setCurrency } from '../lib/money';
import { readProfile, saveProfileToStorage } from '../lib/profile';
import { todayISO } from '../lib/dates';

/**
 * Workspace state (Phase 0.10 client split): one react-query cache for the
 * server data plus a context with the UI state that used to live in App.tsx
 * local state. Views read everything from here, so screens no longer pass
 * fifteen props around.
 */

export const emptyData: AppData = { customers: [], services: [], jobs: [], invoices: [], expenses: [], laundry: [], equipment: [], inventory: [], payments: [], costCategories: [], suppliers: [], depreciationEntries: [], laundryItems: [] };

/** "Today" captured once per workspace load, exactly like the previous module constant. */
export const today = todayISO();

type WorkspaceContextValue = {
  data: AppData;
  loading: boolean;
  loadError: string;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  toast: string;
  view: View;
  setView: (view: View) => void;
  modal: Modal;
  setModal: (modal: Modal) => void;
  modalData: unknown;
  setModalData: (data: unknown) => void;
  query: string;
  setQuery: (query: string) => void;
  profile: WorkspaceProfile;
  saveProfile: (next: WorkspaceProfile) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const useWorkspace = () => {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return value;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  useTheme();
  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ['workspace'],
    queryFn: api.fetchData,
    staleTime: 30_000,
  });

  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [modalData, setModalData] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [profile, setProfile] = useState<WorkspaceProfile>(() => readProfile());

  const data = workspaceQuery.data ?? emptyData;
  const loading = workspaceQuery.isLoading;
  const loadError = workspaceQuery.isError ? 'Could not reach the database. Is the API server running?' : '';

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['workspace'] });
  }, [queryClient]);

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => { setCurrency(profile.currency); }, [profile.currency]);

  const saveProfile = useCallback((next: WorkspaceProfile) => {
    setProfile(next);
    setCurrency(next.currency);
    if (saveProfileToStorage(next)) notify('Workspace profile saved');
    else notify('Could not save the profile');
  }, [notify]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    data,
    loading,
    loadError,
    refresh,
    notify,
    toast,
    view,
    setView,
    modal,
    setModal,
    modalData,
    setModalData,
    query,
    setQuery,
    profile,
    saveProfile,
  }), [data, loading, loadError, refresh, notify, toast, view, modal, modalData, query, profile, saveProfile]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
