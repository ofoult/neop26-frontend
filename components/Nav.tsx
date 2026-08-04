"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./ui";
import { CATEGORIES } from "@/lib/categories";
import { BestSalesMarquee } from "./BestSalesMarquee";
import { LanguageCurrencySelect } from "./LanguageCurrencySelect";

export function Nav() {
  // const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const tCat = useTranslations("Categories");

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
        zIndex: 50,

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
            <Link
              key={cat.id}
              href={`/browse?cat=${cat.id}`}
              prefetch={false}
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
              {cat.emoji} {tCat(cat.id)}
            </Link>
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
