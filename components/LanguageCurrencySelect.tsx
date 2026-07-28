"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { createPortal } from "react-dom";
import { LANGUAGES, CURRENCIES } from "@/lib/languageCurrency";
import { CountryFlag } from "@/components/Flag";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export function LanguageCurrencySelect() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("Nav");
  const t = useTranslations("LanguageSelect");

  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState({
    language: locale,
    currency: "USD",
  });

  const [currency, setCurrency] = useState("USD");

  const activeLanguage = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <>
      <div style={{ marginLeft: "auto" }}>
        <button
          className="nav-lang focus-ring"
          aria-label={tNav("languageAndCurrency")}
          onClick={() => {
            setSelected({ language: locale, currency });
            setOpen(true);
          }}
        >
          <Icon name="globe" size={18} />
          <span className="nav-lang-label">
            {activeLanguage.code.toUpperCase()} · {currency}
          </span>
        </button>
      </div>

      {open &&
        createPortal(
          <div
            onClick={() => {
              setOpen(false);
            }}
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
                  padding: "22px 28px",
                  borderBottom: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <h2
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: 30,
                  }}
                >
                  {t("modalTitle")}
                </h2>

                <button
                  onClick={() => setOpen(false)}
                  className="focus-ring"
                  style={{
                    fontSize: 28,
                    color: "var(--dim)",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  padding: "32px 40px",
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                <h3
                  className="serif"
                  style={{
                    marginTop: 0,
                    marginBottom: 20,
                    fontSize: 22,
                  }}
                >
                  {t("languageAndRegion")}
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  {LANGUAGES.map((language) => {
                    const isSelected = selected.language === language.code;

                    return (
                      <button
                        key={language.code}
                        onClick={() =>
                          setSelected((prev) => ({
                            ...prev,
                            language: language.code,
                          }))
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: 260,
                          padding: "18px 20px",
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          background: isSelected
                            ? "linear-gradient(rgba(7,7,11,0.82), rgba(7,7,11,0.32)), var(--grad)"
                            : "transparent",
                          color: "var(--text)",
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <CountryFlag code={language.flag} />

                          <div>
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 600,
                              }}
                            >
                              {language.language}
                            </div>

                            <div
                              style={{
                                fontSize: 14,
                                color: "var(--dim)",
                                marginTop: 4,
                              }}
                            >
                              {language.region}
                            </div>
                          </div>
                        </div>

                        {/* check mark for selected language */}
                        {isSelected && (
                          <span
                            style={{
                              position: "absolute",
                              top: 10,
                              insetInlineEnd: 12,
                              fontSize: 18,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <h3
                  className="serif"
                  style={{
                    marginTop: 40,
                    marginBottom: 20,
                    fontSize: 22,
                  }}
                >
                  {t("currency")}
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  {CURRENCIES.map((curr) => {
                    const isSelected = selected.currency === curr.code;

                    return (
                      <button
                        key={curr.code}
                        onClick={() =>
                          setSelected((prev) => ({
                            ...prev,
                            currency: curr.code,
                          }))
                        }
                        style={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          width: 260,
                          padding: "18px 20px",
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          background: isSelected
                            ? "linear-gradient(rgba(7,7,11,0.82), rgba(7,7,11,0.32)), var(--grad)"
                            : "transparent",
                          color: "var(--text)",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 600,
                            }}
                          >
                            {curr.name}
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              color: "var(--dim)",
                              marginTop: 4,
                            }}
                          >
                            {curr.code} · {curr.symbol}
                          </div>
                        </div>

                        {isSelected && (
                          <span
                            style={{
                              position: "absolute",
                              top: 10,
                              insetInlineEnd: 12,
                              fontSize: 18,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/*  Apply button */}
                <button
                  onClick={() => {
                    setCurrency(selected.currency);
                    setOpen(false);
                    if (selected.language !== locale) {
                      router.replace(pathname, { locale: selected.language as Locale });
                    }
                  }}
                  style={{
                    marginTop: 40,
                    width: "100%",
                    padding: "14px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background:
                      "linear-gradient(rgba(7,7,11,0.82), rgba(7,7,11,0.32)), var(--grad)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {t("apply")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
