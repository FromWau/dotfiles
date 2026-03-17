## UI/UX Design Principles

### Affordances & Signifiers
- UI elements must communicate their function without instructions
- Containers signal grouping/relatedness; active states signal selection; grayed-out signals disabled
- Every interactive element needs: press state, hover state, active/highlight state
- Use tooltips for non-obvious affordances

### Visual Hierarchy
- Control importance with **size**, **position**, and **color**
- Most important content: large, bold, top-positioned
- Secondary content: smaller, below, subdued color
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
- Start with **one primary/brand color**
- Lighten it for backgrounds, darken it for text — subtle color beats flat gray
- Build a **color ramp** from that primary for chips, states, charts
- Use **semantic colors** with meaning:
  - **Blue** — trust, links, info
  - **Red** — danger, error, urgency
  - **Yellow** — warning, caution
  - **Green** — success, confirmation
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
- Match icon size to **font line height** (e.g., 24px text → 24px icons)
- Tighten gap between icon and text
- **Ghost buttons**: no background until hovered — common in sidebars/nav
- Button padding guideline: **width = 2× height**
- Primary + secondary CTAs side by side: filled primary, ghost/outlined secondary

### Feedback & States
- **Every user action must produce a visible response**
- Buttons need at minimum: **default, hover, active/pressed, disabled** states
- Add **loading state** (spinner) for async actions
- Inputs need: **default, focus** (border highlight), **error** (red border + message), optionally **warning**
- Show loading spinners during data fetches, success messages on completion
- Micro animations on scroll/swipe provide continuous feedback

### Micro Interactions
- Enhanced feedback that **confirms actions** beyond basic state changes
- Examples: slide-up "Copied!" chip, checkmark animation on save, confetti on completion
- Range from highly practical (copy confirmation) to playful (celebration animations)
- Every micro interaction should answer: "Did my action work?"

### Overlays on Images
- Never place raw text over an image — it ruins both
- **Full-screen overlay**: works but hides the image
- **Linear gradient**: shows image at top, fades to solid background for readable text below — best balance
- **Progressive blur + gradient**: modern look, preserves image while ensuring text readability
