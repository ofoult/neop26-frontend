"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { createPortal } from "react-dom";
import { LANGUAGES, CURRENCIES } from "@/lib/languageCurrency";
import { CountryFlag } from "@/components/Flag";
import { useCurrency } from "@/lib/currency";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Tab = "language" | "currency";
const TABS: Tab[] = ["language", "currency"];

/** One compact, selectable tile of the 2-column grid. */
function Option({
  selected,
  onSelect,
  wide,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`lang-option focus-ring${selected ? " lang-option-selected" : ""}`}
      style={wide ? { gridColumn: "1 / -1" } : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>{children}</div>
      {selected && (
        <span aria-hidden style={{ marginInlineStart: "auto", fontSize: 15 }}>
          ✓
        </span>
      )}
    </button>
  );
}

function OptionText({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--dim)",
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function LanguageCurrencySelect() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("Nav");
  const t = useTranslations("LanguageSelect");
  const { currency, setCurrency, status, updatedAt } = useCurrency();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("language");

  const activeLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function selectLanguage(code: string) {
    setOpen(false);
    if (code !== locale) {
      router.replace(pathname, { locale: code as Locale });
    }
  }

  function selectCurrency(code: string | null) {
    setCurrency(code);
    setOpen(false);
  }

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next: Tab =
      e.key === "Home" ? TABS[0] : e.key === "End" ? TABS[TABS.length - 1] : TABS[(TABS.indexOf(tab) + 1) % TABS.length];
    setTab(next);
    document.getElementById(`lang-tab-${next}`)?.focus();
  }

  const tabLabel: Record<Tab, string> = {
    language: t("tabLanguages"),
    currency: t("tabCurrencies"),
  };

  return (
    <>
      <div style={{ marginInlineStart: "auto" }}>
        <button
          className="nav-lang focus-ring"
          aria-label={tNav("languageAndCurrency")}
          onClick={() => setOpen(true)}
        >
          <Icon name="globe" size={18} />
          <span className="nav-lang-label">
            {activeLanguage.code.toUpperCase()}
            {currency ? ` · ${currency}` : ""}
          </span>
          {currency && status === "loading" && <span className="spinner" aria-hidden />}
        </button>
      </div>

      {open &&
        createPortal(
          <div
            onClick={() => {
              setOpen(false);
            }}
            className="lang-modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(6px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              paddingTop: 110,
              zIndex: 300,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="lang-modal-card"
              role="dialog"
              aria-modal="true"
              aria-label={t("modalTitle")}
              style={{
                width: 620,
                maxHeight: "calc(100vh - 140px)",
                borderRadius: 22,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "rgba(7,7,11,0.90)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 30px 100px rgba(0,0,0,.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 24px",
                  borderBottom: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <h2 className="serif" style={{ margin: 0, fontSize: 26 }}>
                  {t("modalTitle")}
                </h2>

                <button
                  onClick={() => setOpen(false)}
                  className="focus-ring"
                  aria-label={t("closeLabel")}
                  style={{ fontSize: 28, color: "var(--dim)", lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              <div
                role="tablist"
                aria-label={t("modalTitle")}
                onKeyDown={onTabKeyDown}
                style={{ display: "flex", gap: 6, padding: "12px 24px 0", flexShrink: 0 }}
              >
                {TABS.map((id) => (
                  <button
                    key={id}
                    id={`lang-tab-${id}`}
                    role="tab"
                    type="button"
                    aria-selected={tab === id}
                    aria-controls={`lang-panel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    className={`lang-tab focus-ring${tab === id ? " lang-tab-active" : ""}`}
                  >
                    {tabLabel[id]}
                  </button>
                ))}
              </div>

              <div
                role="tabpanel"
                id={`lang-panel-${tab}`}
                aria-labelledby={`lang-tab-${tab}`}
                style={{ padding: "16px 24px 22px", overflowY: "auto", minHeight: 0 }}
              >
                {tab === "language" && (
                  <div className="lang-grid">
                    {LANGUAGES.map((language) => (
                      <Option
                        key={language.code}
                        selected={locale === language.code}
                        onSelect={() => selectLanguage(language.code)}
                      >
                        <CountryFlag code={language.flag} width={22} />
                        <OptionText title={language.language} subtitle={language.region} />
                      </Option>
                    ))}
                  </div>
                )}

                {tab === "currency" && (
                  <>
                    <div className="lang-grid">
                      <Option wide selected={currency === null} onSelect={() => selectCurrency(null)}>
                        <span aria-hidden style={{ minWidth: 34, display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <Icon name="ticket" size={18} />
                        </span>
                        <OptionText title={t("eventCurrency")} subtitle={t("eventCurrencyHint")} />
                      </Option>
                      {CURRENCIES.map((curr) => (
                        <Option
                          key={curr.code}
                          selected={currency === curr.code}
                          onSelect={() => selectCurrency(curr.code)}
                        >
                          <span
                            aria-hidden
                            style={{ fontSize: 15, fontWeight: 700, minWidth: 34, textAlign: "center", flexShrink: 0 }}
                          >
                            {curr.symbol}
                          </span>
                          <OptionText title={curr.code} subtitle={curr.name} />
                        </Option>
                      ))}
                    </div>

                    <div
                      role="status"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 14,
                        fontSize: 12.5,
                        color: status === "error" ? "var(--accent-2)" : "var(--dim)",
                      }}
                    >
                      {currency && status === "loading" && (
                        <>
                          <span className="spinner" aria-hidden /> {t("ratesLoading")}
                        </>
                      )}
                      {currency && status === "error" && t("ratesError")}
                      {currency && status === "ready" && updatedAt && (
                        <>
                          {t("ratesUpdated", {
                            time: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(updatedAt),
                          })}
                        </>
                      )}
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--faint)", lineHeight: 1.5 }}>
                      {t("approxHint")}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
