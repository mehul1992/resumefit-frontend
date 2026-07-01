import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDownIcon, HorizontaLDots } from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  {
    name: "Tailor CV",
    path: "/tailor",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3h9l4 4v12H5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 11h6M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 16l1.5 1.5L19 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>({});
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let matched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems?.some((s) => isActive(s.path))) {
        setOpenSubmenu(index);
        matched = true;
      }
    });
    if (!matched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null && subMenuRefs.current[openSubmenu]) {
      setSubMenuHeight((prev) => ({
        ...prev,
        [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight ?? 0,
      }));
    }
  }, [openSubmenu]);

  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link to="/tailor" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 shrink-0">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 3h8l4 4v10H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 3v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M7 10h6M7 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {showLabel && (
            <span className="text-lg font-bold text-gray-900 dark:text-white">ResumeFit</span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav>
          <h2 className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
            {showLabel ? "Menu" : <HorizontaLDots className="size-6" />}
          </h2>
          <ul className="flex flex-col gap-2">
            {navItems.map((nav, index) => (
              <li key={nav.name}>
                {nav.subItems ? (
                  <>
                    <button
                      onClick={() => setOpenSubmenu(openSubmenu === index ? null : index)}
                      className={`menu-item group ${openSubmenu === index ? "menu-item-active" : "menu-item-inactive"} cursor-pointer ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                    >
                      <span className={`menu-item-icon-size ${openSubmenu === index ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                        {nav.icon}
                      </span>
                      {showLabel && <span className="menu-item-text">{nav.name}</span>}
                      {showLabel && (
                        <ChevronDownIcon className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu === index ? "rotate-180 text-brand-500" : ""}`} />
                      )}
                    </button>
                    {showLabel && (
                      <div
                        ref={(el) => { subMenuRefs.current[index] = el; }}
                        className="overflow-hidden transition-all duration-300"
                        style={{ height: openSubmenu === index ? `${subMenuHeight[index]}px` : "0px" }}
                      >
                        <ul className="mt-2 space-y-1 ml-9">
                          {nav.subItems.map((sub) => (
                            <li key={sub.name}>
                              <Link
                                to={sub.path}
                                className={`menu-dropdown-item ${isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  nav.path && (
                    <Link
                      to={nav.path}
                      className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"}`}
                    >
                      <span className={`menu-item-icon-size ${isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                        {nav.icon}
                      </span>
                      {showLabel && <span className="menu-item-text">{nav.name}</span>}
                    </Link>
                  )
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
