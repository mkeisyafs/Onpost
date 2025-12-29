import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'


import type { ForumsUser } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserAvatarUrl(user: ForumsUser | null | undefined): string | undefined {
  if (!user) return undefined;
  return user.extendedData?.profilePhoto || user.avatarUrl || undefined;
}
