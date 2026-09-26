import type { WorkspaceProfile } from '../types';

/** Workspace identity saved in this browser (Settings → Company profile). */
const PROFILE_KEY = 'gabfix.workspace.profile';

export const defaultProfile: WorkspaceProfile = {
  companyName: 'Gabfix Home Solutions',
  tagline: 'Home Solutions',
  phone: '+256 772 000 447',
  address: 'Plot 18, Kira Road, Kampala, Uganda',
  currency: 'UGX',
  basis: 'Cash basis',
  logo: '',
};

export const readProfile = (): WorkspaceProfile => {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...defaultProfile, ...(JSON.parse(raw) as Partial<WorkspaceProfile>) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
};

export const saveProfileToStorage = (profile: WorkspaceProfile): boolean => {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
};
