# Analytics — user journey tracking (GA4)

GA4 property `G-2QQYVYSB98` (tag in `app/[locale]/layout.tsx`). All custom events go through
`track()` in `lib/analytics.ts`; site-wide clicks/scroll come from `components/JourneyTracker.tsx`
(mounted in `Chrome`), the ticket funnel from `useEventFunnel` in `components/TicketsAndSeatingPlan.tsx`.
Every event name is also sent to Microsoft Clarity as a custom tag, so recordings can be filtered by it.

## Parameters on every custom event

| Parameter | Meaning |
| --- | --- |
| `page_type` | `home`, `browse`, `event`, `performer`, `venue`, `map`, `static`, … |
| `landing_page_type` | Page type of the first page of the session (tab) |
| `session_page_index` | How many pages the visitor has seen so far, this one included |
| `events_viewed` | How many event pages they've opened so far |

User properties: `site_locale`, `display_currency` (`event_default` when none is chosen).

## Events

| Event | When | Main parameters |
| --- | --- | --- |
| `page_view`, `session_start`, `scroll` (90 %), `click` (outbound) | GA4 automatic / enhanced measurement | — |
| `ui_click` | Any click on a link, button or tab | `click_section`, `link_text`, `link_type` (`internal`/`outbound`/`button`), `link_url`, `target_page_type` |
| `scroll_depth` | Page scrolled to 25 / 50 / 75 % | `percent_scrolled` |
| `search` | Search bar submitted | `search_term`, `search_where`, `search_dates`, `search_scope` |
| `search_suggestion_click` | Autosuggest result picked | `search_term`, `suggestion_type`, `suggestion_label` |
| `view_search_results` | A browse / search result set is shown | same as `search` + `results_count` (0 = dead end) |
| `browse_sort`, `browse_load_more` | Sort changed / next page loaded | `sort_key` / `results_page` |
| `language_change`, `currency_change` | Picked in the Nav popup | `language_from/to`, `currency_from/to` |
| `view_item` | Event page ticket panel on screen | event params, `tickets_state` (`listings`/`general_link`/`unavailable`), `listing_categories`, `tickets_available`, `has_seating_plan`, `value` (cheapest price), `currency` |
| `tickets_unavailable` | Event page with nothing to buy | event params |
| `ticket_filter` | Quantity / category / type filter used | `filter_type`, `filter_value` |
| `select_item` | Seat count picked on a row, or seat clicked on the plan | `ticket_category`, `seats`, `selection_source` (`row`/`seat_map`) |
| `begin_checkout` | **Click out to Gigsberg** (the conversion) | `value`, `currency`, `ticket_category`, `seats`, `category_position`, `seconds_on_page`, `checkout_type` |
| `event_exit_no_checkout` | Left an event page without clicking out | `tickets_state`, `seconds_on_page`, `max_scroll_pct`, `furthest_step` (`viewed`/`explored`/`selected`), `value` |

Event params = `event_id`, `event_title`, `event_category`, `event_city`, `event_country`, `days_until_event`.

`click_section` comes from the nearest `data-track-section` attribute (`home_hero`, `home_trending`,
`home_weekend`, `home_festivals`, `home_guarantee`, `browse_results`, `ticket_list`, `seat_map`), else
`nav` / `footer` / `dialog` / `content`. Add the attribute to any new block worth telling apart.

## One-time setup in the GA admin (not done by the code)

1. **Key event**: Admin → Events → mark `begin_checkout` as a key event.
2. **Custom dimensions** (Admin → Custom definitions) — parameters are collected without this but
   can't be used in reports until registered. Event-scoped: `page_type`, `landing_page_type`,
   `click_section`, `link_text`, `link_type`, `target_page_type`, `tickets_state`, `furthest_step`,
   `ticket_category`, `selection_source`, `filter_type`, `checkout_type`, `event_title`, `event_city`,
   `event_country`, `search_where`, `suggestion_type`. User-scoped: `site_locale`, `display_currency`.
3. **Custom metrics** (event-scoped, standard): `session_page_index`, `events_viewed`, `seconds_on_page`,
   `max_scroll_pct`, `days_until_event`, `listing_categories`, `tickets_available`, `results_count`,
   `category_position`, `seats`.
4. **Data retention**: Admin → Data settings → Data retention → 14 months (default 2 limits Explorations).

## Reports to build (Explore)

- **Funnel**: `session_start` → `view_item` → `select_item` → `begin_checkout`, broken down by
  `landing_page_type`, device, country, `site_locale`.
- **Why no checkout**: `event_exit_no_checkout` by `tickets_state` × `furthest_step`, with average
  `seconds_on_page` / `max_scroll_pct`; `tickets_unavailable` by `event_title`.
- **Path exploration** starting at `session_start` (or ending at `begin_checkout`) for the page sequence.
- **Where they click**: `ui_click` by `page_type` × `click_section` × `link_text`.
- **Dead-end searches**: `view_search_results` where `results_count` = 0, by `search_term`.

Landing page, pages per session, source/medium and engagement time are GA4 built-ins — no code needed.
