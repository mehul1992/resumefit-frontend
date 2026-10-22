export const CARD_CLASS =
  "rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]";

export const UPPER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-gray-400";

export const SMALL_BUTTON_CLASS =
  "h-8 rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]";

const ACTION_BASE_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export const OUTLINE_ACTION_CLASS = `${ACTION_BASE_CLASS} border border-gray-300 bg-white px-[18px] text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]`;

export const SAVED_ACTION_CLASS = `${ACTION_BASE_CLASS} border border-gray-300 bg-success-50 px-[18px] text-gray-700 hover:bg-success-100 dark:border-gray-700 dark:bg-success-500/15 dark:text-gray-300`;

export const PRIMARY_ACTION_CLASS = `${ACTION_BASE_CLASS} bg-brand-500 px-5 text-white hover:bg-brand-600 disabled:hover:bg-brand-500`;

export const LINK_CLASS = "font-medium text-brand-600 hover:text-[#2a31d8] dark:text-brand-400";
