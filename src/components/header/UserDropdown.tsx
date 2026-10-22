import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../common/UserAvatar";

const ITEM_BASE_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors duration-150 hover:bg-gray-100 focus:bg-gray-100 focus:outline-hidden dark:hover:bg-white/5 dark:focus:bg-white/5";
const ITEM_CLASS = `${ITEM_BASE_CLASS} text-gray-700 dark:text-gray-400 dark:hover:text-gray-300`;

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "Guest";

  const closeMenu = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeMenu]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        closeMenu(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  async function handleSignOut() {
    closeMenu(false);
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="account-menu"
        aria-label="Account menu"
        className="flex items-center gap-2.5 font-medium text-gray-700 dark:text-gray-400"
      >
        <UserAvatar user={user} className="h-11 w-11" />
        <span className="block text-theme-sm">{user?.first_name ?? "Account"}</span>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id="account-menu"
          role="menu"
          aria-label="Account"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-14 z-30 flex w-[280px] flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-3 text-theme-sm shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          <div className="mb-2 flex flex-col gap-0.5 border-b border-gray-200 px-3 pt-2 pb-3.5 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-white/90">{fullName}</span>
            <span className="text-[13px] text-gray-500 dark:text-gray-400">{user?.email ?? ""}</span>
          </div>

          <Link role="menuitem" to="/profile" onClick={() => closeMenu(false)} className={ITEM_CLASS}>
            <MenuIcon>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </MenuIcon>
            Edit profile
          </Link>
          <Link role="menuitem" to="/profile" onClick={() => closeMenu(false)} className={ITEM_CLASS}>
            <MenuIcon>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </MenuIcon>
            Account settings
          </Link>
          <Link role="menuitem" to="/resumes" onClick={() => closeMenu(false)} className={ITEM_CLASS}>
            <MenuIcon>
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h6" />
            </MenuIcon>
            Processed resumes
          </Link>
          {/* TODO: point at the real help centre once it exists. */}
          <a role="menuitem" href="#" onClick={() => closeMenu(false)} className={ITEM_CLASS}>
            <MenuIcon>
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" />
            </MenuIcon>
            Support
          </a>

          <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
            <button
              role="menuitem"
              type="button"
              onClick={handleSignOut}
              className={`${ITEM_BASE_CLASS} w-full text-error-600 dark:text-error-500`}
            >
              <MenuIcon>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </MenuIcon>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
