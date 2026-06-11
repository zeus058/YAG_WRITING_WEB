const mockOnlyStorageKeys = [
  "yag.mockMembership",
  "yag.mockHistory",
  "yag.author.sessions",
  "yag.author.announcements",
];

const legacyDemoSignatures = [
  "Mưa Trên Thành Cũ",
  "Cánh Cửa Sau Sao Băng",
  "Minh Nguyệt",
  "Linh An",
  "Admin YAG",
  "Chỉnh sửa thô chương 12",
  "Hoàn thiện chương 13 nháp",
  "Mọi người nghĩ sao về chi tiết mở nút",
  "Hương Trà",
  "Gia Hiển",
  "Phú Thọ",
  "Duy Trường",
  "Yến Nhi",
];

function storage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function isLegacyDemoValue(value: string | null) {
  if (!value) return false;
  return legacyDemoSignatures.some((signature) => value.includes(signature));
}

export function clearMockStorageWhenDisabled(useMocks: boolean) {
  const localStorage = storage();
  if (!localStorage || useMocks) return;

  for (const key of mockOnlyStorageKeys) {
    localStorage.removeItem(key);
  }

  for (const key of ["yag.forum.posts", "yag.author.sessions", "yag.author.announcements"]) {
    const value = localStorage.getItem(key);
    if (isLegacyDemoValue(value)) {
      localStorage.removeItem(key);
    }
  }
}

export function getStoredJsonArray<T = unknown>(key: string, useMocks: boolean): T[] {
  const localStorage = storage();
  if (!localStorage) return [];

  const stored = localStorage.getItem(key);
  if (!stored) return [];

  if (!useMocks) {
    if (isLegacyDemoValue(stored)) {
      localStorage.removeItem(key);
    }
    return [];
  }

  if (isLegacyDemoValue(stored)) {
    localStorage.removeItem(key);
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
