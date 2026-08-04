"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { getSubcategories } from "@/app/actions";
import { Icon } from "./Icon";
import { Logo } from "./ui";
import { CATEGORIES } from "@/lib/categories";
import { subcategoriesByCategory, type Subcategory } from "@/lib/subcategories";
import type { Category } from "@/lib/types";
import { BestSalesMarquee } from "./BestSalesMarquee";
import { LanguageCurrencySelect } from "./LanguageCurrencySelect";

export function Nav() {
  // const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const tCat = useTranslations("Categories");
  const tNav = useTranslations("Nav");

  // Subcategories are fetched lazily on first hover of any category pill —
  // not on mount — so this never adds a request (or bytes) to a page load
  // where the visitor never opens a submenu, including the home page. `null`
  // = not fetched yet, fetch in flight, or fetch failed; each pill treats
  // that as "no submenu" until it resolves.
  const [subcatsByCategory, setSubcatsByCategory] = useState<Partial<Record<Category["id"], Subcategory[]>> | null>(null);
  const [subcatsLoading, setSubcatsLoading] = useState(false);
  const fetchStarted = useRef(false);

  function ensureSubcategoriesLoaded() {
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    setSubcatsLoading(true);
    getSubcategories()
      .then((subs) => setSubcatsByCategory(subcategoriesByCategory(subs)))
      .catch(() => setSubcatsByCategory({}))
      .finally(() => setSubcatsLoading(false));
  }

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        // Above SearchBar's form (200) and its autosuggest/date dropdowns
        // (210) — both the Hero's and the browse page's search bars — so the
        // category submenu below renders on top of them instead of underneath
        // when they overlap. Still below the language/drawer modals (300),
        // which should stay topmost over everything including the nav.
        zIndex: 220,

        //the following style is the special effect that was on before marquee ... keep and revert to it in case marquee is voted out.
        // background: scrolled ? "rgba(7,7,11,0.82)" : "transparent",
        // backdropFilter: scrolled ? "blur(18px)" : "none",
        // borderBottom: scrolled
        //   ? "1px solid var(--border)"
        //   : "1px solid transparent",
        // transition: "all .3s",

        background: "rgba(7,7,11,0.62)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="nav-inner">
        <Logo href="/" />
        <nav className="nav-links">
          {/* prefetch={false}: this bar is sticky and always in the initial
              viewport, so all 5 links would otherwise fire RSC prefetch
              requests immediately on every page load, competing for
              bandwidth with the LCP image/JS on throttled mobile
              connections for a navigation a visitor rarely takes right away. */}
          {CATEGORIES.map((cat) => (
            <CategoryNavItem
              key={cat.id}
              cat={cat}
              label={tCat(cat.id)}
              subcategories={subcatsByCategory?.[cat.id]}
              loading={subcatsLoading}
              loadingLabel={tNav("loadingSubcategories")}
              onReveal={ensureSubcategoriesLoaded}
            />
          ))}
        </nav>
        {/* <button
          className="nav-lang focus-ring"
          aria-label="Language and currency"
        >
          <Icon name="globe" size={18} />
          <span className="nav-lang-label">EN · USD</span>
        </button> */}
        <LanguageCurrencySelect />
      </div>
      <BestSalesMarquee />
    </header>
  );
}

/**
 * A category pill that keeps navigating straight to /browse/{cat.id} on
 * click (unchanged), and on hover/focus (pointer + keyboard) additionally
 * reveals a panel of that category's subcategories — plain links to
 * /browse/{subcategory.slug}, same click-to-navigate behavior as the pill
 * itself. Touch devices have no hover, so the panel just doesn't appear
 * there; subcategories stay reachable via the <select> on the browse page.
 * Interaction (hover with a short close delay, outside click, Escape) mirrors
 * FilterDropdown in components/TicketFilters.tsx.
 */
function CategoryNavItem({
  cat,
  label,
  subcategories,
  loading,
  loadingLabel,
  onReveal,
}: {
  cat: Category;
  label: string;
  /** undefined while the shared fetch hasn't resolved yet for this Nav instance. */
  subcategories: Subcategory[] | undefined;
  loading: boolean;
  loadingLabel: string;
  onReveal: () => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
    onReveal();
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }
  // Closing on click (rather than waiting for closeSoon's delay or a
  // mouseleave that may never fire during client-side navigation) means the
  // panel doesn't stay stuck open over whatever page the link navigates to.
  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const hasSubcategories = subcategories !== undefined && subcategories.length > 0;
  const showPanel = open && (hasSubcategories || (loading && subcategories === undefined));

  return (
    <div
      ref={rootRef}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={closeSoon}
      style={{ position: "relative", display: "inline-block" }}
    >
      <Link
        href={`/browse/${cat.id}`}
        prefetch={false}
        onClick={closeNow}
        className="focus-ring category-pill"
        style={{
          "--cat-color": cat.color,
          padding: "8px 14px",
          margin: "0 10px",
          fontSize: 14.5,
          fontWeight: 500,
          borderRadius: 999,
          color: "var(--text)",
          background: `linear-gradient(rgba(7,7,11,0.72), rgba(7,7,11,0.08)), ${cat.color}`,
        } as React.CSSProperties}
      >
        {cat.emoji} {label}
      </Link>

      {showPanel && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            insetInlineStart: 10,
            minWidth: 200,
            maxHeight: 320,
            overflowY: "auto",
            padding: 8,
            background: "#12121b",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-2)",
            borderRadius: 16,
            boxShadow: "0 24px 60px -20px rgba(0,0,0,.7)",
            zIndex: 60,
          }}
        >
          {subcategories === undefined ? (
            <div style={{ padding: "8px 10px", fontSize: 13, color: "var(--faint)" }}>{loadingLabel}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {subcategories.map((s) => (
                <Link
                  key={s.slug}
                  href={`/browse/${s.slug}`}
                  prefetch={false}
                  onClick={closeNow}
                  className="focus-ring"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 9,
                    fontSize: 13.5,
                    color: "var(--dim)",
                    whiteSpace: "nowrap",
                    background: "transparent",
                    transition: "background .12s, color .12s",
                  }}
                  // Same hover-highlight pattern as the search bar's
                  // autosuggest rows (SearchField in SearchBar.tsx) and
                  // CheckboxRow in TicketFilters.tsx.
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                    e.currentTarget.style.color = "var(--text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--dim)";
                  }}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
