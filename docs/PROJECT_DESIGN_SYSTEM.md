# PROJECT_DESIGN_SYSTEM.md

# Marvel's Basket — Design System & UI/UX Guidelines

**Project:** Marvel's Basket  
**Organization:** Marvel's Techworks  
**Document Version:** 1.0  
**Status:** Approved Visual Direction  
**Last Updated:** 19 November 2026

---

# 1. Design Philosophy & Aesthetic Direction

## 1.1 Visual Archetype

Modern Hyperlocal Quick-Commerce & Grocery Marketplace.

The visual direction follows the usability and conversion-oriented principles of modern grocery platforms such as Blinkit, BigBasket, and Instacart.

These references establish the design category, not permission to independently redesign the provided Marvel's Basket reference.

## 1.2 Core Tone

- Fresh
- Trustworthy
- Vibrant
- Modern
- Clean
- Conversion-focused
- Easy to navigate
- High utility

The interface balances bold organic greens with high-contrast yellow CTAs and a clean white canvas.

## 1.3 Primary Design Objective

Reproduce the provided Marvel's Basket reference design as faithfully as possible.

The reference image is the primary visual authority for:

- Navbar structure and appearance.
- Brand identity and logo placement.
- Search bar design.
- Location selector.
- Navigation links.
- Hero banner.
- Category rail.
- Seller discovery cards.
- Colors and visual hierarchy.
- Spacing and component proportions.

**The AI development agent MUST inspect the supplied reference image before implementing the frontend.**

Do not substitute the reference with a newly imagined design.

## 1.4 Layout Strategy

- 12-column responsive layout.
- Maximum desktop content width: `1280px`.
- Centered content container.
- Sticky dual-tier navigation.
- Full-width promotional hero within the content container.
- Horizontal category rail.
- Multi-column seller discovery grid.
- Consistent spacing and alignment.

## 1.5 Overall UI/UX Principles

1. Visual consistency across every page.
2. Mobile-first responsive implementation.
3. Simple and predictable navigation.
4. Fast access to products and sellers.
5. Clear visual hierarchy.
6. Accessible typography and contrast.
7. Purposeful animations.
8. Smooth transitions between interface states.
9. Minimal unnecessary visual complexity.
10. Performance-first frontend implementation.

---

# 2. Information Architecture & Page Sections

## 2.1 Dual-Tier Top Navigation Header

**Priority: CRITICAL — MUST MATCH THE REFERENCE DESIGN**

The navbar is one of the most important elements of Marvel's Basket.

Its structure, alignment, colors, spacing, typography, and visual hierarchy must closely match the supplied reference image.

### A. Primary Utility Bar — Top Row

#### Brand Identity — Left

- Custom shopping basket icon.
- Stacked uppercase wordmark.
- Brand text: `MARVEL'S BASKET`.
- Brand icon and text use the specified brand green.
- Consistent horizontal alignment.

#### Hyperlocal Delivery Selector

- Location pin icon.
- Muted micro-label: `Deliver to`.
- Bold location name.
- Initial reference location: `Azamgarh, UP`.
- Location selector must be interactive.
- Location should ultimately come from the user's selected delivery location, not a permanently hardcoded value.

#### Global Search Bar — Center

Placeholder:

`Search for groceries, fruits, milk and more...`

Visual characteristics:

- Pill-shaped input.
- Soft gray background.
- Subtle border.
- Leading search icon.
- Trailing search action icon.
- Smooth focus state.
- Responsive width.

#### Account & Cart Actions — Right

- Login icon and label.
- Cart icon and label.
- Clear spacing.
- Consistent icon sizes.
- Cart item count indicator when applicable.

### B. Secondary Category & Trust Bar — Bottom Row

A horizontal navigation strip separated by a subtle bottom border.

Navigation links:

- `All Categories ▾`
- `Offers`
- `Become a Seller`
- `Track Order`
- `Help`

Visual rules:

- `All Categories` uses brand green.
- Other navigation items use secondary slate.
- Dropdown indicator appears alongside All Categories.
- Hover and active states must be implemented.
- Navigation must remain visually consistent with the reference.

### Navbar Behavior

- Sticky positioning on desktop.
- White background.
- Subtle bottom border.
- Appropriate stacking order.
- Smooth sticky behavior.
- Search remains accessible.
- Dropdowns open and close predictably.
- Outside-click and Escape-key behavior should be supported where appropriate.

### Mobile Navbar

The mobile navbar must preserve the same brand identity and design language.

It must adapt without simply shrinking the desktop navbar.

Expected behavior:

- Compact brand header.
- Brand logo remains clearly visible.
- Location selector remains accessible.
- Account and cart actions remain accessible.
- Search moves into a dedicated full-width row where required.
- Secondary navigation becomes a horizontally scrollable category/navigation rail or an accessible menu.
- No horizontal page overflow.
- Touch targets should be comfortably usable.

If a mobile menu is required, use a clean slide-down panel or drawer consistent with the original design.

**Do not remove important navigation actions merely to fit the screen.**

---

## 2.2 Hero Banner Section

### Container

- Rounded-corner card.
- Border radius: `16px`.
- Rich dark-to-vibrant forest green gradient.
- Organic curved lime-green wave accent near the bottom center.
- Responsive split layout.

### Left Column — Value Proposition

Headline:

**Groceries & Daily Essentials Delivered Fast!**

Visual requirements:

- Large white display typography.
- Strong contrast.
- Bold headline.
- Comfortable line height.
- Clear hierarchy.

### Trust Badges

Three horizontal lime-yellow capsule pills:

- `Multiple Sellers`
- `Best Prices`
- `Quick Delivery`

Visual requirements:

- Lime chartreuse background.
- Dark green or charcoal text.
- Fully rounded capsule shape.
- Consistent padding.
- Small, readable text.

### Primary CTA

Button text:

`Shop Now →`

Visual requirements:

- Citrus yellow background.
- Dark charcoal text.
- Bold typography.
- Fully rounded pill.
- Visible hover and pressed states.
- Appropriate shadow.

### Right Column — Product Photography

Required visual:

High-resolution cutout/composite studio photograph of a branded green shopping basket overflowing with fresh produce.

Suggested visible contents:

- Bell peppers.
- Tomatoes.
- Broccoli.
- Carrots.
- Milk bottle.
- Grains.
- Fresh grocery essentials.

The basket should rest on a warm wooden surface.

### Hero Responsive Behavior

Desktop:
- Two-column layout.
- Copy on the left.
- Product image on the right.
- Maintain the original visual proportions.

Tablet:
- Maintain a balanced split layout when space permits.
- Scale typography and imagery.
- Avoid text-image collisions.

Mobile:
- Stack the content vertically.
- Headline first.
- Trust badges below the headline.
- CTA clearly visible.
- Basket image below or beside the content depending on available space.
- Preserve the green gradient and organic visual accents.

The hero must remain visually recognizable at every breakpoint.

---

## 2.3 Quick-Access Category Rail

### Layout

Desktop:
- 8-column equal-width grid.
- Gap: `16px`.

### Category Cards

Each card contains:

- Soft off-white/light-gray square tile.
- Rounded corners.
- Colorful 3D or flat-illustrated category icon.
- Centered category label underneath.

### Categories

1. Groceries
2. Fruits & Vegetables
3. Dairy & Bakery
4. Snacks & Beverages
5. Personal Care
6. Home & Cleaning
7. Baby Care
8. More

### Visual Rules

- Tile background: `#F4F6F8`.
- Border radius: `14px`.
- Centered icon.
- Consistent icon dimensions.
- Label size: `13px`.
- Medium or semibold typography.
- Consistent card dimensions.

### Responsive Behavior

| Screen | Layout |
|---|---|
| Large Desktop | 8 columns |
| Desktop | 8 columns where space permits |
| Tablet | 4 columns or horizontally scrollable rail |
| Mobile | Horizontally scrollable category rail or 4-column grid |

Mobile interaction must support touch scrolling without causing page-level horizontal overflow.

---

## 2.4 Featured Sellers Near You

### Section Header

Flex row containing:

Left:
`Featured Sellers Near You`

Right:
`View All →`

Visual rules:

- Bold left-aligned section heading.
- Brand-green right-aligned action link.
- Consistent vertical alignment.

### Seller Grid

Desktop:
- 4 columns.
- Gap: `20px`.

### Seller Card Anatomy

#### Media

- Storefront photograph.
- Aspect ratio: `16:9` or `4:3`.
- Rounded top corners.
- Appropriate image cropping.
- Consistent image presentation.

#### Metadata Body

Example seller names:

- City Fresh Mart
- Sharma Grocery
- Apna Super Store
- Daily Needs Shop

Each card must include:

- Bold store name.
- Amber star icon.
- Numerical rating, e.g. `4.6`.
- Green clock/timer icon.
- Delivery ETA, e.g. `15 min`.

### Responsive Behavior

| Screen | Layout |
|---|---|
| Large Desktop | 4 columns |
| Desktop | 4 columns |
| Tablet | 2 columns |
| Mobile | 1 or 2 columns depending on available width |

Seller cards must maintain consistent image proportions, padding, and metadata alignment.

---

# 3. Component Inventory

| Component | Variant / Type | Key Visual Characteristics |
|---|---|---|
| Navbar | Sticky Dual-Tier | White surface, subtle border, inline search pill, location dropdown |
| Search Input | Pill Input | Soft gray fill, subtle border, search icons |
| Location Selector | Interactive Selector | Pin icon, muted label, bold location |
| Hero Banner | Split Promotional Card | Green gradient, wave accent, white copy, product imagery |
| Feature Pills | Static Highlight Badges | Lime-yellow fill, dark text, capsule radius |
| Primary Button | Solid CTA Pill | Citrus yellow, bold text, arrow icon, hover lift |
| Category Tile | Icon + Label Stack | Neutral background, centered illustration |
| Seller Card | Media + Metadata Card | Store image, title, rating, ETA |
| Section Header | Heading + Action | Bold heading, green action link |
| Dropdown | Navigation Menu | Clean white surface, subtle shadow |
| Modal | Dialog | White surface, rounded corners, overlay |
| Mobile Navigation | Responsive Menu | Compact and touch-friendly |
| Loading State | Skeleton | Neutral placeholder shapes |
| Empty State | Informative State | Simple illustration and helpful text |
| Toast | Feedback Message | Compact notification with clear status |

---

# 4. Responsive Design System

## 4.1 Core Requirement

**Marvel's Basket MUST be fully responsive.**

The interface must work properly on:

- Small mobile phones.
- Standard mobile phones.
- Large mobile phones.
- Tablets.
- Laptops.
- Desktop monitors.
- Large desktop screens.

The desktop design must not simply be scaled down to mobile.

Each layout must adapt intelligently while preserving the same visual identity.

## 4.2 Breakpoint Strategy

Use the following initial responsive breakpoints:

| Breakpoint | Width | Target |
|---|---:|---|
| Small Mobile | `< 375px` | Compact phones |
| Mobile | `375px – 639px` | Standard phones |
| Tablet | `640px – 767px` | Small tablets |
| Large Tablet | `768px – 1023px` | Tablets |
| Desktop | `1024px – 1279px` | Laptops |
| Large Desktop | `1280px+` | Desktop monitors |

These are initial CSS breakpoints. Components should also adapt naturally to their available container width.

## 4.3 Container Specifications

Desktop:
- Maximum width: `1280px`.
- Centered container.
- Horizontal padding: `48px`.

Mobile:
- Horizontal padding: `24px`.

Intermediate widths:
- Fluid width.
- Avoid fixed widths that cause overflow.
- Use responsive padding.

## 4.4 Responsive Typography

Typography must scale smoothly across screen sizes.

Suggested behavior:

- Hero heading: fluid scaling using `clamp()`.
- Section headings: responsive but visually consistent.
- Card titles: readable at all widths.
- Navigation labels: remain legible.
- Metadata: never become too small to read.

Avoid arbitrary font-size reductions that damage hierarchy.

## 4.5 Responsive Rules

- No unintended horizontal scrolling.
- No overlapping content.
- No clipped navigation actions.
- No distorted images.
- No fixed-width layouts that break smaller screens.
- No inaccessible dropdowns.
- No tiny interactive targets.
- No content hidden behind sticky elements.
- No layout shifts during image loading.

## 4.6 Mobile-First Development

All components should be implemented with mobile behavior in mind.

Then progressively enhance layouts for tablet and desktop.

Use CSS Grid and Flexbox appropriately.

Use responsive image dimensions and optimized image loading.

---

# 5. Visual Tokens & UI Specifications

# 5.1 Color Palette

## Brand & Primary Greens

| Token | Name | Hex |
|---|---|---|
| `--color-forest` | Deep Forest Green | `#0B5D2A` |
| `--color-brand` | Brand Emerald Green | `#15803D` |
| `--color-leaf` | Fresh Leaf Green | `#22A047` |
| `--color-lime` | Vibrant Lime Wave | `#84CC16` |

## Action & Highlight Accents

| Token | Name | Hex |
|---|---|---|
| `--color-cta` | Citrus Yellow | `#F4E022` |
| `--color-highlight` | Lime Chartreuse | `#D4E137` |
| `--color-rating` | Rating Amber | `#F59E0B` |

## Neutrals & Surfaces

| Token | Name | Hex |
|---|---|---|
| `--color-white` | Pure Canvas White | `#FFFFFF` |
| `--color-surface` | Soft Cool Gray | `#F3F4F6` |
| `--color-border` | Subtle Divider Border | `#E5E7EB` |
| `--color-ink` | Primary Ink | `#111827` |
| `--color-text` | Secondary Slate | `#374151` |
| `--color-muted` | Muted Gray | `#6B7280` |

## Semantic Colors

Additional semantic colors may be introduced for:

- Success.
- Warning.
- Error.
- Information.
- Disabled states.

These colors must complement the existing palette rather than replace the brand identity.

---

# 5.2 Typography

## Font Family

Primary:

`Plus Jakarta Sans`

Fallback:

`Inter`, sans-serif.

Use a consistent font system throughout the application.

## Typography Scale

| Role | Size | Weight | Line Height | Letter Spacing | Color |
|---|---:|---:|---:|---|---|
| Hero Display (H1) | 40px | 700 | 1.15 | -0.02em | `#FFFFFF` |
| Section Heading (H2) | 20px | 700 | 1.3 | -0.01em | `#111827` |
| Card Title (H3) | 15px | 700 | 1.35 | 0 | `#111827` |
| CTA Button | 15px | 700 | 1.0 | 0 | `#111827` |
| Nav & Category Label | 13px | 600 | 1.3 | 0 | `#1F2937` |
| Feature Pill | 12px | 600 | 1.0 | 0.01em | `#14361D` |
| Metadata / ETA / Rating | 12px | 600 | 1.2 | 0 | `#374151` |
| Micro-label | 11px | 500 | 1.2 | 0 | `#6B7280` |

Desktop hero typography may use the full `40px` display size. Mobile typography should scale responsively.

---

# 5.3 Border Radii

| Component | Radius |
|---|---|
| Search Bar | `9999px` |
| CTA Button | `9999px` |
| Feature Pills | `9999px` |
| Hero Banner | `16px` |
| Category Icon Tile | `14px` |
| Seller Card | `12px` |

Maintain consistency across repeated components.

---

# 5.4 Shadows & Borders

| Element | Specification |
|---|---|
| Header Bottom Border | `1px solid #E5E7EB` |
| Search Input Border | `1px solid #E2E8F0` |
| Seller Card Border | `1px solid #F1F5F9` |
| Seller Card Shadow | `0 2px 8px rgba(17, 24, 39, 0.06)` |
| CTA Button Shadow | `0 4px 12px rgba(0, 0, 0, 0.15)` |

Shadows must remain subtle.

Avoid excessive elevation, heavy blur, or unnecessary glassmorphism.

---

# 5.5 Spacing System

| Element | Spacing |
|---|---|
| Mobile Page Padding | `24px` |
| Desktop Page Padding | `48px` |
| Section Vertical Rhythm | `28px` |
| Category Grid Gap | `16px` |
| Seller Grid Gap | `20px` |

Use a consistent spacing scale for component padding, section gaps, and layout alignment.

Avoid arbitrary spacing values unless required by the reference.

---

# 6. Animation & Motion Design System

## 6.1 Animation Philosophy

Marvel's Basket should feel modern, smooth, responsive, and interactive.

Animations are required, but they must be purposeful.

The interface should not feel like a heavily animated landing page.

Motion must:

- Improve interaction feedback.
- Guide user attention.
- Make transitions feel natural.
- Communicate state changes.
- Improve perceived responsiveness.
- Preserve usability and performance.

**Animations must enhance the existing design, not change it.**

## 6.2 Global Motion Principles

- Prefer short and smooth animations.
- Avoid excessive bouncing.
- Avoid unnecessary continuous animations.
- Avoid large movement distances.
- Avoid animations that delay user interaction.
- Keep motion consistent across components.
- Animate only when it provides meaningful feedback.

## 6.3 Recommended Motion Tokens

| Token | Duration | Usage |
|---|---:|---|
| `--motion-fast` | `150ms` | Hover, button feedback |
| `--motion-normal` | `250ms` | Dropdowns, card interactions |
| `--motion-slow` | `400ms` | Section transitions |
| `--motion-enter` | `500ms` | Initial content reveal |

Preferred easing:

`cubic-bezier(0.2, 0.8, 0.2, 1)`

## 6.4 Navbar Animations

- Smooth dropdown opening.
- Subtle hover transitions.
- Search input focus transition.
- Cart count update feedback.
- Mobile menu slide-down or drawer transition.
- Sticky navbar must not jump or flicker while scrolling.

## 6.5 Hero Animations

On initial page load:

- Headline may fade in with a slight upward movement.
- Trust badges may appear with a subtle stagger.
- CTA may fade in after the headline.
- Basket image may fade in with a slight scale transition.
- Decorative wave must remain visually consistent.

Avoid exaggerated zooms, spinning objects, or continuous image movement.

## 6.6 Category Animations

On hover or tap:

- Slight upward movement.
- Subtle tile elevation.
- Icon scale transition.
- Smooth background transition.

Suggested behavior:

- Translate Y: `-3px`.
- Scale: `1.02`.
- Duration: `150–250ms`.

## 6.7 Seller Card Animations

On hover:

- Slight card elevation.
- Subtle image scale.
- Smooth shadow transition.
- Optional green accent transition.

On mobile:

- Use touch feedback.
- Do not depend on hover states.

## 6.8 Button Animations

Primary CTA:

- Slight upward hover movement.
- Smooth shadow change.
- Pressed state with subtle scale reduction.
- Clear focus-visible outline.

Avoid large transformations.

## 6.9 Loading Animations

Implement:

- Skeleton loaders.
- Subtle shimmer effect.
- Button loading indicators.
- Progress feedback where appropriate.

Skeletons must preserve the final component dimensions to reduce layout shift.

## 6.10 Page Transitions

Use subtle transitions when moving between major pages where appropriate.

Avoid delaying navigation.

Page transitions must respect browser navigation behavior and should not interfere with loading or interaction.

## 6.11 Reduced Motion Accessibility

Respect:

`prefers-reduced-motion: reduce`

When enabled:

- Disable nonessential motion.
- Remove decorative continuous animations.
- Reduce transition distances.
- Preserve all interaction functionality.
- Keep content immediately accessible.

---

# 7. Interaction & UI States

Every interactive component must have clearly defined states.

## 7.1 Buttons

States:

- Default.
- Hover.
- Focus.
- Active/Pressed.
- Disabled.
- Loading.

## 7.2 Inputs

States:

- Default.
- Focus.
- Filled.
- Error.
- Disabled.
- Loading where applicable.

## 7.3 Cards

States:

- Default.
- Hover.
- Active.
- Selected where applicable.

## 7.4 Dropdowns

Requirements:

- Clear open/closed states.
- Keyboard navigation.
- Outside-click handling.
- Escape-key support.
- Appropriate focus management.

## 7.5 Cart

Requirements:

- Visible cart count.
- Immediate interaction feedback.
- Quantity update feedback.
- Clear empty state.
- Loading state during server operations.
- Error handling for unavailable items.

## 7.6 Search

Requirements:

- Visible focus state.
- Search submission feedback.
- Clear input option when useful.
- Search loading state.
- Empty results state.
- Responsive behavior on mobile.

---

# 8. Accessibility Standards

The application should follow WCAG 2.2 AA principles wherever applicable.

Requirements:

- Semantic HTML.
- Correct heading hierarchy.
- Keyboard accessibility.
- Visible focus indicators.
- Appropriate image alt text.
- Accessible form labels.
- Sufficient color contrast.
- Accessible dropdowns and dialogs.
- Appropriate ARIA attributes.
- Touch-friendly interaction areas.
- Reduced motion support.
- Screen-reader-friendly status messages.

Do not communicate important information using color alone.

Decorative icons should be hidden from assistive technologies when appropriate.

---

# 9. Image & Asset Guidelines

## 9.1 Image Quality

Use high-quality, appropriately optimized assets.

Avoid:

- Blurry product imagery.
- Stretched images.
- Inconsistent image proportions.
- Unnecessary stock watermarks.
- Unrelated decorative images.

## 9.2 Hero Image

The hero image must closely follow the supplied basket-and-produce visual.

The basket must remain the dominant visual element.

## 9.3 Seller Images

Seller images should represent grocery stores or relevant storefronts.

Maintain consistent aspect ratios and image cropping.

## 9.4 Category Icons

Use a consistent illustration style across all category icons.

Do not mix unrelated icon styles.

## 9.5 Image Performance

- Use optimized image formats.
- Set image dimensions or aspect ratios.
- Lazy-load below-the-fold imagery.
- Prioritize the hero image where appropriate.
- Prevent cumulative layout shift.
- Provide meaningful fallback behavior.

---

# 10. UI Consistency Across Applications

Marvel's Basket may contain multiple application areas:

1. Customer-facing marketplace.
2. Seller dashboard.
3. Admin dashboard.

All must use the same foundational design system.

## Customer Interface

Focus:

- Product discovery.
- Seller discovery.
- Search.
- Shopping.
- Cart.
- Checkout.
- Order tracking.

## Seller Interface

Focus:

- Store management.
- Product listings.
- Inventory.
- Orders.
- Fulfillment.
- Earnings.

## Admin Interface

Focus:

- Platform overview.
- Seller management.
- Customer management.
- Product moderation.
- Orders.
- Payments.
- Reports.

Dashboards may use denser layouts and specialized navigation, but must retain the same:

- Brand colors.
- Typography.
- Buttons.
- Form styles.
- Border radii.
- Spacing principles.
- Interaction behavior.

Do not force the customer-facing dual-tier navbar into dashboard layouts if a dedicated dashboard navigation is more appropriate.

The dashboard must still look like part of Marvel's Basket.

---

# 11. Frontend Implementation Guidelines

## 11.1 Framework

- Next.js.
- TypeScript.
- Next.js App Router.
- Responsive CSS.
- Reusable React components.

## 11.2 Styling

Use a centralized design-token approach.

Store shared values in CSS variables or the project's chosen theme configuration.

Avoid scattered hardcoded colors and inconsistent component styling.

## 11.3 Component Organization

Suggested structure:

```text
apps/web/src/
│
├── app/
│
├── components/
│   ├── layout/
│   │   ├── navbar/
│   │   ├── footer/
│   │   └── containers/
│   │
│   ├── home/
│   │   ├── hero/
│   │   ├── categories/
│   │   └── featured-sellers/
│   │
│   ├── ui/
│   │   ├── button/
│   │   ├── input/
│   │   ├── modal/
│   │   └── dropdown/
│   │
│   └── shared/
│
├── hooks/
├── lib/
├── services/
├── styles/
├── types/
└── utils/
```

The structure can evolve as the application grows.

## 11.4 Animation Implementation

Use CSS transitions and keyframes for simple interactions.

Use a suitable animation library only when more complex animation behavior is genuinely needed.

Animation dependencies must not be introduced unnecessarily.

## 11.5 Performance

- Avoid unnecessary component re-renders.
- Optimize image delivery.
- Lazy-load appropriate sections.
- Avoid oversized animation bundles.
- Prevent layout shifts.
- Maintain responsive performance on lower-powered mobile devices.

---

# 12. Mandatory AI Agent Design Instructions

The following instructions are mandatory for any AI coding agent working on Marvel's Basket.

## 12.1 Reference Image First

Before implementing the frontend:

1. Inspect the original Marvel's Basket reference image supplied by the project owner.
2. Identify the navbar structure.
3. Identify the page layout.
4. Identify the colors and typography.
5. Identify component proportions.
6. Identify spacing and alignment.
7. Identify the hero and product imagery.
8. Identify the category and seller card layouts.

Do not begin visual implementation without inspecting the reference image.

## 12.2 Visual Fidelity

The supplied reference image is the primary source of truth.

The agent MUST:

- Reproduce the navbar as closely as possible.
- Preserve the same navbar hierarchy.
- Preserve the brand identity.
- Follow the specified hero composition.
- Follow the category rail design.
- Follow the seller card design.
- Follow the specified color palette.
- Follow the typography and spacing system.

The agent MUST NOT:

- Invent a different navbar.
- Replace the specified colors with another theme.
- Change the visual identity.
- Introduce unrelated gradients.
- Add excessive glassmorphism.
- Replace the design with a generic dashboard template.
- Randomly change border radii.
- Introduce inconsistent component styles.
- Add animations that distract from shopping.

## 12.3 Responsive Implementation

The agent MUST:

- Implement mobile-first layouts.
- Test small and large mobile screens.
- Test tablet layouts.
- Test laptop and desktop layouts.
- Verify navbar behavior at every breakpoint.
- Prevent horizontal overflow.
- Preserve usability and readability.
- Maintain the visual identity across all devices.

## 12.4 Animation Implementation

The agent MUST:

- Add subtle, purposeful animations.
- Implement hover and pressed states.
- Implement smooth dropdown transitions.
- Add appropriate loading states.
- Animate hero content subtly.
- Add category and seller-card interaction feedback.
- Respect reduced-motion preferences.
- Avoid unnecessary animation complexity.

## 12.5 Design Approval

Before implementing multiple pages, create and verify the initial homepage against the supplied reference image.

The homepage visual implementation should establish the reusable design system for the rest of the application.

Do not propagate an unverified visual design across every page.

---

# 13. Design Quality Assurance Checklist

Before considering any page visually complete, verify the following.

## Reference Fidelity

- [ ] Reference image inspected.
- [ ] Navbar visually matches the reference.
- [ ] Logo and branding match.
- [ ] Search input matches.
- [ ] Location selector matches.
- [ ] Hero layout matches.
- [ ] Category rail matches.
- [ ] Seller cards match.
- [ ] Colors match the design tokens.
- [ ] Typography matches the specifications.
- [ ] Spacing and alignment are consistent.

## Responsiveness

- [ ] Small mobile tested.
- [ ] Standard mobile tested.
- [ ] Large mobile tested.
- [ ] Tablet tested.
- [ ] Laptop tested.
- [ ] Desktop tested.
- [ ] No horizontal overflow.
- [ ] No overlapping content.
- [ ] No broken images.
- [ ] Navbar remains usable.
- [ ] All important actions remain accessible.

## Animation & Interaction

- [ ] Button hover and pressed states.
- [ ] Dropdown transitions.
- [ ] Search focus state.
- [ ] Category hover/touch feedback.
- [ ] Seller-card interactions.
- [ ] Loading states.
- [ ] Skeleton loaders.
- [ ] Reduced-motion behavior.

## Accessibility

- [ ] Keyboard navigation.
- [ ] Visible focus states.
- [ ] Accessible form labels.
- [ ] Semantic structure.
- [ ] Appropriate image descriptions.
- [ ] Sufficient color contrast.
- [ ] Accessible interactive elements.

## Performance

- [ ] Optimized images.
- [ ] No major layout shifts.
- [ ] No unnecessary animations.
- [ ] No oversized assets.
- [ ] Mobile performance checked.

---

# 14. Final Design Rules

These rules take precedence over individual implementation preferences.

1. The supplied Marvel's Basket reference image is the primary visual authority.
2. The navbar must closely reproduce the provided reference.
3. The specified design palette must remain consistent.
4. The homepage must follow the documented section structure.
5. The entire application must be fully responsive.
6. Animations must be smooth, subtle, and purposeful.
7. The customer, seller, and admin interfaces must share one brand identity.
8. Reusable components must follow the same design tokens.
9. No generic template redesign is permitted.
10. Visual changes outside this system require project-owner approval.

---

# 15. Final Design Direction

Marvel's Basket must look and feel like a modern, polished, trustworthy hyperlocal grocery marketplace.

The intended experience is:

- Fresh green brand identity.
- Clean white interface.
- Vibrant yellow conversion actions.
- Clear product and seller discovery.
- Familiar and intuitive navigation.
- Smooth micro-interactions.
- Fully responsive layouts.
- Consistent visual quality across every screen.

**The goal is not to create a new design inspired by the reference. The goal is to faithfully implement the Marvel's Basket design, then make it responsive, interactive, accessible, and production-ready.**

---

# 16. Phase 05 Implementation & Component Inventory

**Phase Status:** Completed & Verified  
**Implementation Directory:** `apps/web`

### 16.1 Asset Pipeline & Branding
- **Official Brand Logos:**
  - `apps/web/public/images/logo.png`: Full official logo on white background.
  - `apps/web/public/images/logo-light.png`: Optimized light theme logo.
  - `apps/web/public/images/logo-dark.jpg`: High-contrast dark theme logo.
  - `apps/web/public/images/design-reference.jpg`: Reference UI screenshot.
- **Brand Logo Component (`apps/web/src/components/shared/logo.tsx`):**
  - Implements `full`, `compact`, and `icon` variants with responsive height optimization and priority image loading.

### 16.2 Design Tokens & Theme Configuration
- `apps/web/src/styles/tokens.ts`: Centralized, typed export of colors, radii, shadows, and breakpoints.
- `apps/web/tailwind.config.ts`: Tailwind extended with `forest` (`#0B5D2A`), `brand` (`#15803D`, `#22A047`), `cta` (`#F4E022`), `highlight` (`#D4E137`), and surface neutrals. Custom border radii: `tile` (14px), `card` (12px), `banner` (16px).
- `apps/web/src/app/globals.css`: Custom utility classes (`.no-scrollbar`), WCAG AA focus visible styling, and reduced-motion queries.

### 16.3 Reusable Component Primitives
- **Button (`apps/web/src/components/ui/button.tsx`):** CVA variants (`primary`/`cta`, `brand`, `secondary`, `outline`, `ghost`, `destructive`, `link`), sizes (`sm`, `md`, `lg`, `pill`, `icon`), integrated loading state.
- **Form Controls (`apps/web/src/components/ui/`):**
  - `input.tsx`: Text/email/search with label, helper, error, and pill search variant.
  - `textarea.tsx`: Multi-line text field with error states.
  - `select.tsx`: Native select with custom chevron indicator.
  - `checkbox.tsx`: Accessible custom checkbox.
  - `radio.tsx`: Accessible radio button with checked ring.
  - `switch.tsx`: Accessible toggle switch with smooth translation.
- **Surface & Navigation Primitives (`apps/web/src/components/ui/`):**
  - `card.tsx`: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
  - `badge.tsx`: CVA badge with `brand`, `highlight` (lime chartreuse), `cta`, `neutral`.
  - `dialog.tsx`: Accessible modal with backdrop blur, focus trapping, escape key dismiss, and scroll lock.
  - `dropdown-menu.tsx`: Accessible popup menu with click-outside dismiss and keyboard navigation.

### 16.4 Feedback & Skeleton Primitives
- `spinner.tsx`: SVG animated circular spinner with multi-color and size variants.
- `skeleton.tsx`: Pulse loading placeholders, plus pre-composed `StoreCardSkeleton` and `CategoryTileSkeleton`.
- `empty-state.tsx`: Accessible empty container state with icon, title, description, and call-to-action button.
- `error-state.tsx`: Accessible error presentation with retry callback.

### 16.5 Layout & Layout-Level Components
- `storefront-layout.tsx`: Public storefront wrapper integrating Header and Footer.
- `header.tsx`: Dual-tier responsive navigation reproducing reference design (Tier 1: brand logo, location selector modal for Azamgarh UP, pill search, login button, cart count; Tier 2: Category trigger, promotional links, mobile drawer).
- `footer.tsx`: Trust strip (`Superfast Delivery`, `Verified Sellers`, `Secure Payments`, `Hyperlocal Support`), catalog links, merchant links, and legal links.
- `hero-banner.tsx`: Gradient banner with organic wave accent, bold headline, 3 highlight trust pills (`Multiple Sellers`, `Best Prices`, `Quick Delivery`), yellow CTA (`Shop Now →`), and official 3D grocery basket imagery.
- `category-rail.tsx`: 8-category rail on `#F4F6F8` tiles matching the reference design.
- `featured-sellers.tsx`: Store cards (`City Fresh Mart`, `Sharma Grocery`, etc.) with rating stars, delivery ETAs, and verified tags.

---

# 17. Phase 06 — Mobile-First Customer Navigation & Account Patterns

### 17.1 Mobile-First Viewport Priority
Marvel's Basket is targeted at an audience where more than 90% of user sessions occur on mobile smartphones. The UI architecture enforces an uncompromising mobile-first hierarchy:
1. **Mobile Smartphones (Highest Priority):** Full-bleed responsive cards, touch targets with minimum dimensions of 44x44px, bottom sheets / modal dialogues rather than cramped multi-column forms, sticky navigation bars, and native safe area insets (`env(safe-area-inset-bottom)`).
2. **Tablets (Second Priority):** Two-column card grids, comfortable touch targets, and balanced content containers.
3. **Desktop (Third Priority):** 4-column responsive grid with a sticky account navigation sidebar (`lg:col-span-1`) and main content area (`lg:col-span-3`).

### 17.2 Persistent Mobile Bottom Navigation
- Component: `apps/web/src/components/layout/mobile-bottom-nav.tsx`
- Visibility: Mobile only (`md:hidden`), sticky at viewport bottom with `z-40` elevation and subtle backdrop blur.
- Destinations:
  1. **Home (`/`):** Quick return to main storefront.
  2. **Categories (`/categories`):** Explore grocery aisles.
  3. **Basket (`/basket`):** Active shopping basket with dynamic item count badge.
  4. **Addresses (`/addresses`):** Direct access to saved delivery addresses.
  5. **Profile (`/profile`):** Customer profile, account preferences, and orders.
- Active Indicator: Highlights active tab with primary brand green (`#00873D`, `stroke-[2.2]`, font-bold).
- Safe Area Offset: Content wrappers incorporate `pb-16 md:pb-0` to eliminate content clipping behind the navigation bar.

### 17.3 Basket Terminology Standard
In accordance with brand identity and market conventions, all customer-facing touchpoints strictly utilize **Basket** rather than Cart:
- Navigation: "Basket", "My Basket", "View Basket".
- Empty State: "Your Basket is Empty".
- Call to Action: "Explore Groceries", "Add to Basket".
- Accessibility: `aria-label="Shopping basket with {n} items"`.

### 17.4 Customer Profile & Address Design Components
- **`ProfileHeader`:** Organic gradient brand accent bar, avatar with fallback uppercase initials, customer name, verified email status badge, and member since date.
- **`ProfileForm`:** Clean card layout with name, avatar URL, date of birth, and non-editable protected identity blocks.
- **`AccountSettingsCard`:** Granular switch toggles for notification channels (Email, Push, SMS, Promotions), security overview, session sign out, and account deactivation modal.
- **`AddressCard`:** Badge category pills (`Home`, `Work`, `Other`), default address indicator, formatted recipient contact and address details, "Set as Default" button, edit action, and delete confirmation.
- **`AddressFormModal`:** Accessible dialog/bottom sheet with category selector pills, Indian PIN code validation, 10-digit mobile number validation, and default address checkbox.

---

**Document End — PROJECT_DESIGN_SYSTEM.md**