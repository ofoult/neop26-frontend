'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { currencySymbol } from '@/lib/format';
import type { ApiListingCategory, ApiSeatingPlanCategory } from '@/lib/types';

/** Strips whitespace so "VIP 1" lines up with the SVG's "VIP1" data-name. */
function normalizeBlockName(block: string): string {
  return block.trim().replace(/\s+/g, '');
}

/** The category's own top-level SVG group id (its name with spaces -> underscores). */
function scopeId(categoryName: string): string {
  return categoryName.trim().replace(/\s+/g, '_');
}

/**
 * The data-name candidates a block name can appear under. Gigsberg's
 * seating-plan SVGs mark named blocks (e.g. "VIP1", "Platea") with a
 * data-name of "0<blockName>" but plain numeric blocks with just the number
 * itself — so both forms are tried per block; whichever doesn't exist in the
 * markup simply matches nothing.
 */
function blockDataNameCandidates(block: string): string[] {
  const name = normalizeBlockName(block);
  return name ? [name, `0${name}`] : [];
}

/**
 * Walks up from `el` to find the element that is a direct child of `ancestor`
 * — i.e. the specific per-block element within a category's scope group,
 * regardless of whether the hover landed on its shape, its text label, or a
 * nested tspan inside that label.
 */
function directChildOf(el: Element, ancestor: Element): Element | null {
  let node: Element | null = el;
  while (node && node.parentElement !== ancestor) {
    node = node.parentElement;
  }
  return node;
}

/**
 * Resolves the category + block name the given event target sits inside, using
 * the same scope+direct-child logic as everywhere else in this file. Shared
 * between hover and click handling.
 */
function resolveBlockAtTarget(
  target: Element,
  scopeSelectorList: string,
  categoryByScopeId: Map<string, ApiSeatingPlanCategory>,
): { category: ApiSeatingPlanCategory; block: string } | null {
  if (!scopeSelectorList) return null;
  const scopeEl = target.closest(scopeSelectorList);
  const category = scopeEl ? categoryByScopeId.get(scopeEl.id) : undefined;
  // The block element is whichever direct child of the scope group `target`
  // sits under — its label's "<name>_text" suffix is stripped so hovering
  // either the seat shape or its text both resolve to the same block name.
  const blockEl = scopeEl ? directChildOf(target, scopeEl) : null;
  const dataName = blockEl?.getAttribute('data-name')?.replace(/_text$/, '') ?? null;
  const block = category && dataName ? category.blocks.find((b) => blockDataNameCandidates(b).includes(dataName)) : undefined;
  return category && block ? { category, block } : null;
}

/** Builds the `<style>` block that fills the given category's blocks. */
function buildHighlightCss(categoryName: string, blocks: string[]): string {
  const scope = `#${CSS.escape(scopeId(categoryName))}`;
  const selectors = blocks.flatMap((block) =>
    blockDataNameCandidates(block).map((c) => `${scope} [data-name="${CSS.escape(c)}"]`),
  );
  if (selectors.length === 0) return '';
  return `${selectors.join(',\n')} { fill: var(--accent) !important; transition: fill .15s; }`;
}

interface HoverInfo {
  block: string;
  category: string;
  fromPrice: number;
  maxPrice: number;
  currency: string | null;
  x: number;
  y: number;
}

export function SeatingPlanSvg({
  svgMarkup,
  categories,
  pricingCategories,
  fallbackCurrency,
  hoveredCategoryName,
  onHoverSeatCategory,
  onSeatClick,
  alt,
}: {
  svgMarkup: string;
  /** Venue-map categories (block lists) from /seating-plan. */
  categories: ApiSeatingPlanCategory[];
  /** Live pricing categories from /listings — a seat only gets a tooltip when its block's category has a name match here. */
  pricingCategories: ApiListingCategory[];
  fallbackCurrency: string;
  hoveredCategoryName: string | null;
  /** Fired with the hovered seat's category name (or null on leave) — drives the matching price row's effect. */
  onHoverSeatCategory?: (name: string | null) => void;
  /** Fired with a clicked, priced seat's category name — lets a click add it to the bucket. */
  onSeatClick?: (categoryName: string) => void;
  alt: string;
}) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    onHoverSeatCategory?.(hover?.category ?? null);
  }, [hover?.category, onHoverSeatCategory]);

  const categoryHighlightCss = useMemo(() => {
    if (!hoveredCategoryName) return '';
    const match = categories.find((c) => c.name.trim().toLowerCase() === hoveredCategoryName.trim().toLowerCase());
    return match ? buildHighlightCss(match.name, match.blocks) : '';
  }, [categories, hoveredCategoryName]);

  // The single seat currently under the cursor (see handleMouseMove) — filled
  // in addition to, and independently of, the category-wide highlight above.
  const seatHighlightCss = useMemo(() => {
    return hover ? buildHighlightCss(hover.category, [hover.block]) : '';
  }, [hover]);

  // Maps each category's top-level SVG group id back to the category, so a
  // hovered block's ancestor group tells us which category it belongs to.
  // Deliberately reads from the SVG's own static id/data-name attributes
  // (baked into svgMarkup) rather than mutating the DOM: any imperative
  // tagging gets lost the moment this component re-renders, since React
  // re-parses dangerouslySetInnerHTML from the same string.
  const categoryByScopeId = useMemo(() => {
    const map = new Map<string, ApiSeatingPlanCategory>();
    for (const category of categories) map.set(scopeId(category.name), category);
    return map;
  }, [categories]);

  const scopeSelectorList = useMemo(
    () => [...categoryByScopeId.keys()].map((id) => `#${CSS.escape(id)}`).join(','),
    [categoryByScopeId],
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const resolved = resolveBlockAtTarget(e.target as Element, scopeSelectorList, categoryByScopeId);
    if (!resolved) {
      setHover((prev) => (prev ? null : prev));
      return;
    }
    // Only show a tooltip when we actually have price info for this block's category.
    const pricing = pricingCategories.find(
      (c) => c.name.trim().toLowerCase() === resolved.category.name.trim().toLowerCase(),
    );
    if (!pricing) {
      setHover((prev) => (prev ? null : prev));
      return;
    }
    setHover({
      block: resolved.block,
      category: resolved.category.name,
      fromPrice: pricing.fromPrice,
      maxPrice: pricing.maxPrice,
      currency: pricing.currency,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!onSeatClick) return;
    const resolved = resolveBlockAtTarget(e.target as Element, scopeSelectorList, categoryByScopeId);
    if (!resolved) return;
    // Only "available" (priced) seats are clickable — matches the tooltip condition.
    const hasPricing = pricingCategories.some(
      (c) => c.name.trim().toLowerCase() === resolved.category.name.trim().toLowerCase(),
    );
    if (hasPricing) onSeatClick(resolved.category.name);
  }

  const sym = hover ? currencySymbol(hover.currency, fallbackCurrency) : '';
  const hasRange = !!hover && hover.maxPrice > hover.fromPrice;

  return (
    <div
      className="seatmap-svg"
      role="img"
      aria-label={alt}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
      onClick={handleClick}
      style={{ position: 'relative', cursor: hover ? 'pointer' : undefined }}
    >
      <style>{categoryHighlightCss}</style>
      <style>{seatHighlightCss}</style>
      {/* Gigsberg's own SVG, sanitized server-side and inlined so individual
          blocks can be targeted by the CSS/hover logic above. */}
      <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />

      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.x + 16,
            top: hover.y + 16,
            zIndex: 50,
            pointerEvents: 'none',
            background: 'var(--bg-2)',
            border: '1px solid var(--border-2)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            lineHeight: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700 }}>{hover.category}</div>
          <div style={{ color: 'var(--dim)' }}>Block {hover.block}</div>
          <div style={{ fontWeight: 700, marginTop: 2 }}>
            From {sym}
            {hover.fromPrice}
            {hasRange && (
              <span style={{ fontWeight: 500, color: 'var(--dim)' }}>
                {' – '}
                {sym}
                {hover.maxPrice}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
