---
name: uiux-design
description: UI/UX design principles — visual fundamentals (affordances, hierarchy, layout, typography, color, dark mode, states, micro-interactions) and product UX patterns (consistency, navigation, search, filters, forms, platform conventions, anti-dark-patterns). Apply for any frontend work (Compose, React/HTML, Figma, CSS), including casual "make this look better" requests.
---

# UI/UX Design Principles

Visual fundamentals come first — they set the look. Product UX patterns come second — they shape the feel of using the app over time. A polished button on a confusing nav still produces a bad product.

---

## Visual Fundamentals

### Affordances & Signifiers
- UI elements must communicate their function without instructions
- Containers signal grouping/relatedness; active states signal selection; grayed-out signals disabled
- Every interactive element needs: press state, hover state, active/highlight state
- Use tooltips for non-obvious affordances

### Visual Hierarchy
- Control importance with **size**, **position**, and **color**
- Most important content: large, bold, top-positioned. Secondary: smaller, below, subdued
- Hierarchy comes from **contrast** — the difference between elements (small vs big, colorful vs muted)
- Price/key metrics: top-aligned, accent-colored, visually distinct from surrounding text
- Use icons + visual connectors instead of text labels where meaning is clear (e.g., route lines instead of "from/to")
- Use images whenever possible — they add color pop and make scanning easy

### Grids, Layouts & Spacing
- Grids are **guidelines**, not strict rules — custom layouts don't need to snap to columns
- Grids are most useful for structured/repeating content (galleries, blogs, dashboards) and responsive breakpoints (12 → 8 → 4 columns)
- **White space matters more than grids** — let elements breathe
- Use a **4-point grid** for spacing (multiples of 4): enables consistent halving and creates design coherence
- Group related elements with tighter spacing; separate unrelated groups with more space (another form of hierarchy)

### Typography
- **One font is enough** for any design — pick a clean sans-serif and stick with it
- **Header optimization**: tighten letter spacing to -2% to -3%, drop line height to 110–120% — instantly polishes large text
- Limit to **~6 font sizes** for websites/landing pages
- For **dashboards**: text rarely exceeds 24px due to higher information density
- Hierarchy in text: vary size, weight, and color — not font family

### Color
- Start with **one primary/brand color**. Lighten for backgrounds, darken for text — subtle color beats flat gray
- Build a **color ramp** from that primary for chips, states, charts
- **Simplify the palette** — too many similar shades ("which blue is the blue?") creates visual noise. Aim for: 2 text colors, a few background levels, 1–2 brand colors, 2–3 accent colors
- Use **semantic colors** with meaning:
  - **Blue** — trust, links, info
  - **Red** — danger, error, urgency
  - **Yellow** — warning, caution
  - **Green** — success, confirmation
- **Dynamic color** for media-heavy contexts: derive accents from cover art / hero image so the surface feels like it belongs to the current content. Vibrant when active, muted when paused/inactive. Soulless gray pages kill the vibe
- Color should serve **purpose**, not decoration

### Dark Mode
- Lower border contrast — light borders are too harsh on dark backgrounds
- Create depth with **lighter cards on darker backgrounds** (inverse of light mode shadows)
- Dim saturation and brightness on bright chips; flip for their text
- Shadows don't work in dark mode — rely on surface color differences for depth
- Dark backgrounds aren't limited to gray/navy — deep purples, reds, greens all work

### Shadows
- Default shadows are almost always too strong — **reduce opacity, increase blur**
- Shadow strength depends on context:
  - **Cards**: subtle, light shadows
  - **Popovers/floating content**: stronger shadows (sits above other content)
- Combine inner + outer shadows for tactile effects (raised buttons)
- **Rule**: if the shadow is the first thing you notice, it's too strong

### Icons & Buttons
- Match icon size to **font line height** (e.g., 24px text → 24px icons); tighten the gap between icon and label
- **Ghost buttons**: no background until hovered — common in sidebars/nav
- Button padding guideline: **width = 2× height**
- Primary + secondary CTAs side by side: filled primary, ghost/outlined secondary
- **Never use unicode characters as icons** — use real icon components (`Icon()` in Compose, `<svg>` in web). Unicode renders inconsistently across platforms and fonts
- **One icon per concept** across the entire app — don't use 4 different playlist icons on 4 different screens
- All icons share the same style (sharp OR rounded, not mixed) and uniform size/alignment within a context
- Replace stale icons — a 2010-era logo next to modern ones reads as broken

### Feedback & States
- **Every user action must produce a visible response**
- Buttons need at minimum: **default, hover, active/pressed, disabled** states; add **loading** for async
- Inputs need: **default, focus** (border highlight), **error** (red border + message), optionally **warning**
- Show loading spinners during fetches, success affirmations on completion
- Micro-animations on scroll/swipe provide continuous feedback

### Micro-Interactions
- Enhanced feedback that **confirms actions** beyond basic state changes
- Examples: slide-up "Copied!" chip, checkmark animation on save, confetti on completion
- Range from highly practical (copy confirmation) to playful (celebration)
- Every micro-interaction should answer: "Did my action work?"

### Overlays on Images
- Never place raw text over an image — it ruins both
- **Linear gradient**: image at top, fades to solid background for readable text below — best balance
- **Progressive blur + gradient**: modern look, preserves image while ensuring readability
- Full-screen overlay works but hides the image

### Cards & Hover States
- **No layout shifts on hover** — cards that expand and obscure other action buttons cause misclicks. Reveal extra actions without moving surrounding content
- Always show the primary action (play/install/add to cart) without requiring a click-through
- **Distinct visual states** for saved/favorited/wishlisted: outline → filled, color change. Don't reuse the same icon for added and not-added
- Show inline progress on the item itself (e.g., download bar on the card)

---

## Product UX Patterns

### Consistency
- **Menu order is the same everywhere** — "Favorite" shouldn't jump above other items on one screen and below them on another. Desktop and mobile share the same structure
- **Same feature set on every platform** — don't have "hide song" on mobile but not desktop
- **Visually distinguish content types** — albums, playlists, podcasts, songs (or articles, videos, products) should be recognizable even without thumbnail. A song result and an album result must never look identical
- Reuse the same layout pattern for pages that serve the same purpose (artist albums vs. library albums)

### Navigation
- **One discoverable entry point per feature** — if friends/library/subscriptions is reachable from 3+ places, that's confusion masquerading as convenience
- Put all main sections in **one navigation surface** — don't scatter them across sidebars, headers, footers, and popups
- Important pages (explore, trending, settings) shouldn't be buried at the bottom of a sidebar
- Desktop sidebars should **collapse** to a compact icon menu for more content area
- **Tabs beat extra page loads** for related content — screenshots, badges, lyrics, queue should colocate with the parent context. Every "go to new page → go back" round-trip is friction that could be a tab switch

### Search
- Click search → **immediately focused, ready to type**. Don't make users click twice
- **Every list-heavy page deserves a search bar** (artist page, library, settings, comments) — users feel powerless without one
- Show **actual results first**, recommendations after — don't pad results with unrelated suggestions
- **Categorize results** and visually distinguish types (songs first, then albums, then videos, etc.)

### Filters & Sorting
- **Persistently visible** — not in a popup that disappears after each selection
- Consistent placement: sidebar or directly below the search bar, the same on every page
- Always include **Reset / Clear all**
- **Hide or grey out empty filter options** when a combination would return zero results
- Standard sort essentials: date added, date released, alphabetical, most relevant, most used. Filtering essentials: favorites, downloaded, by category, by date range
- Filter chips should look **visually distinct** from other tags/buttons in the app
- On mobile, don't bury filters under "more options" — surface them

### Frequent Actions
- Most-used actions (favorite, save, add to playlist, play, install) belong **at the top / most accessible position**. If there's screen space, surface them as visible buttons rather than burying in menus
- **If an action takes 4+ clicks, it needs a shortcut**
- Minimize interaction depth: edit price inline rather than "remove listing → go to inventory → create new listing"
- Separate distinct concerns into distinct icons — "like" and "add to playlist" are different actions, don't merge them into one menu
- **Long-press / hold gestures** for 2–3 quick actions without expanding a full menu
- **Bulk actions** for lists: multi-select + add/remove/move in one shot, never one-by-one

### Space Usage
- Don't waste whitespace while hiding controls in menus — if there's room, surface useful actions
- **Show metadata where it matters**: release dates, duration, genre tags, discount expiry, current market price, actual review percentages (70%/30% split, not vague labels). Don't bury this in a submenu
- **Collapsed-by-default sections** that expand on demand beat infinite scroll through everything at once. Albums on an artist page: collapsed list, opened individually
- Offer **grid / list / detail** view options for content-heavy pages so users pick their density

### Homepage / Feed
- **Prioritize the user's taste** — favorite genres/topics first, then popular/trending
- Let users **pin, move, hide, or add rows** — "your homepage, your rules"
- A single one-off view (one video on a new topic) shouldn't hijack the feed forever. Provide a way to **refresh recommendations**
- **Separate Discover (algorithmic) from Home (curated)**. New/Trending sections should have a "For You" tab alongside global charts
- Marketing recommendations should not dominate the home feed
- Infinite scroll for casual browsing, structured browse/filter for intentional searching — both have a place

### Player Patterns (media apps)
- **Mini player**: visible progress indicator, song name and controls close together (not opposite ends of the screen), dynamic color from album art that mutes when paused
- Don't shrink hitboxes to force engagement — if someone wants to close the player, let them
- **Expanded player is self-contained**: info + controls + lyrics + queue all accessible from one cluster, switchable in one tap. Don't ping-pong eyes across the screen with controls bottom-left, info top-right, lyrics in a right sidebar
- **Volume**: only include an in-app slider if it controls app-specific volume. If it duplicates system volume, it's wasted space
- Shuffle/repeat/autoplay live in the player, not on a separate screen
- Lyrics on mini player → small popup preview, not a full page navigation

### Forms & Settings
- One settings page with **tabs/sections** (Account, Security, Privacy) — don't scatter settings across popups, separate pages, and subpages
- Put each setting **next to its input**; minimize explanatory text and use info icons for details on demand
- **Toggles** for on/off, not checkboxes
- Group related settings under clear section headers; concise labels, not paragraphs

### Reachability vs Eye Travel
- Moving one element closer to the thumb is **pointless if it forces eyes to traverse the full screen** for related elements. Search box at the bottom but filters and results at the top is a net loss
- Group input + filters + results in the same region. All actions related to one item should be **near each other**

### Platform-Specific
- **Mobile**: bottom nav for primary sections (4–5 items max), 48dp minimum touch targets, swipe gestures for common actions
- **Desktop**: collapsible sidebar + compact top menu is the gold standard. Master-detail layout (list left, content right). Hover states on every interactive element. Keyboard shortcuts for power users. Multiple view options (list/grid/detail) for content-heavy pages
- **Cross-platform**: same feature set everywhere, layout adapts but menu structure and option ordering stay consistent

### Engagement Without Dark Patterns
- **Let users leave** — don't shrink close/minimize buttons to force engagement. Friction breeds resentment, not retention
- "Personalized" means **user-controlled personalization**, not algorithm-decided. Let users choose notification types, feed content, recommendation categories
- A one-time view shouldn't permanently alter recommendations — ask before assuming interest changed
- **Transparency**: show actual review percentages (not vague labels), discount expiry, what's included, price-change trends. Don't hide information that affects user decisions
