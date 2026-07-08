"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./ui";
import { CATEGORIES } from "@/lib/categories";

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  const onBrowse = pathname === "/browse";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: scrolled ? "rgba(7,7,11,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
        transition: "all .3s",
      }}
    >
      <div className="nav-inner">
        <Logo href="/" />
        <nav className="nav-links">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?cat=${cat.id}`}
              className="focus-ring"
              style={{
                padding: "8px 14px",
                fontSize: 14.5,
                fontWeight: 500,
                borderRadius: 999,
                color: "var(--text)",
                backgroundColor: cat.color,
              }}
            >
              {cat.emoji} {cat.label}
            </Link>
          ))}
        </nav>
        <button
          className="nav-lang focus-ring"
          aria-label="Language and currency"
        >
          <Icon name="globe" size={18} />
          <span className="nav-lang-label">EN · USD</span>
        </button>
      </div>
    </header>
  );
}
