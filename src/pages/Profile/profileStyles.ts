export const CARD_CLASS =
  "rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]";

const BUTTON_BASE_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export const OUTLINE_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-gray-300 bg-white px-[18px] text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]`;

export const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-brand-500 px-[22px] text-white hover:bg-brand-600 disabled:hover:bg-brand-500`;

export const DANGER_OUTLINE_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-error-300 bg-white px-[18px] text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:bg-transparent dark:text-error-500 dark:hover:bg-error-500/10`;

export const DANGER_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-error-600 px-[18px] text-white hover:bg-error-700 disabled:hover:bg-error-600`;
