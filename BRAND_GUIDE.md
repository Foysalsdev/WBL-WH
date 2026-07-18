# Whirlpool Bangladesh — Brand Reference

> Extracted from https://www.whirlpool-bangladesh.com on July 18, 2026
> This is the official brand guide for the WBL-WH warehouse management system.

---

## 🎨 Brand Colors (Verified)

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| **Whirlpool Gold** | `#eeb111` | Primary brand color — logo swirl, accents, highlights, vertical bars |
| **Pure Black** | `#000000` | Logo text, primary text |
| **White** | `#ffffff` | Background, text on dark surfaces |

### Secondary Colors (from banner analysis)
| Color | Hex | Usage |
|-------|-----|-------|
| **Navy/Dark Blue** | `#0a1320` to `#142032` | Sidebar, dark mode background, banner 2 background |
| **Warm Brown** | `#5d4037` to `#3e2723` | Banner 1 background (emotional/warm) |
| **Light Gray** | `#f5f5f5` to `#e0e0e0` | Card backgrounds, dividers |
| **Medium Gray** | `#4f4f4f` | Secondary text |

---

## 🖼 Logo

### Official Logo
- **Source:** https://whirlpoolbn.vtexassets.com/assets/vtex/assets-builder/whirlpoolbn.whirlpoolbn-store/0.1.27/images/logo-dark___67dae163edc2d81a62d0b362bf3dc1d8.svg
- **Format:** SVG (vector — scalable)
- **Width:** 202px × Height: 67.306px
- **Colors:**
  - Text "Whirlpool": Black `#000000`
  - Swirl icon (after the "W"): Gold `#eeb111`
- **Files saved:**
  - `public/whirlpool-logo.svg` (dark version for light backgrounds)
  - `public/whirlpool-logo-white.svg` (same — placeholder for white version)

---

## 📐 Layout Principles (from website analysis)

### Header/Top Bar
- **Background:** White `#ffffff`
- **Logo:** Left side, dark logo variant
- **Navigation:** Horizontal, text-based
  - Refrigerators
  - Washing Machines
  - Air Conditioners
  - Microwaves
- **Search:** Right side, icon-based

### Hero/Banner Section
- **Layout:** Split layout (image left, text right OR text left, image right)
- **Style:** Emotional photography (people using products)
- **Background:** Either warm tones (brown/wood) OR dark navy gradient
- **Accent:** Gold vertical bar or gold underline highlight
- **Text:** White on dark backgrounds, dark on light backgrounds
- **Typography:** Sans-serif, clean, large headings

### Product Categories
- **Layout:** Card grid (4 columns on desktop)
- **Cards:** White background, subtle shadow
- **Icons:** Product images
- **Hover:** Subtle lift effect

### Footer
- **Background:** Dark (navy/black)
- **Text:** White/light gray
- **Sections:**
  - Discover Whirlpool (company info)
  - The Company
  - The Brand
  - Global Locations
  - Careers
  - Sustainability
- **Contact:**
  - Phone: 09610 20 40 20
  - Email: helpdeskbangladesh@whirlpool.com
- **Social:** Facebook, Twitter, Instagram, YouTube

---

## 🎯 Brand Voice & Tone

### Tagline
- **"Every day, care."** — primary tagline
- **"Behind every chore is an act of love"** — emotional hook
- **"Over 110 years of global expertise"** — heritage

### Tone
- Warm, emotional, family-focused
- Professional but approachable
- Trustworthy (heritage + expertise)

---

## 🔤 Typography

### Font Family
- **Primary:** Sans-serif (likely Helvetica Neue or similar — clean, modern)
- **Headings:** Bold, large, tight letter-spacing
- **Body:** Regular weight, comfortable line-height

### Font Sizes (relative)
- **H1:** 2.5rem (hero)
- **H2:** 1.75rem (section titles)
- **H3:** 1.25rem (subsection)
- **Body:** 1rem
- **Small:** 0.875rem

---

## ✅ WBL-WH Implementation Status

| Element | Status | Notes |
|---------|--------|-------|
| Gold primary color | ✅ Done | `--primary: oklch(0.78 0.16 84)` |
| Black logo text | ✅ Done | Logo SVG updated |
| Gold swirl in logo | ✅ Done | Official SVG downloaded |
| Navy sidebar | ✅ Done | `--sidebar: oklch(0.20 0.04 264)` |
| White background | ✅ Done | `--background: oklch(0.985 0.002 240)` |
| Gold accents | ✅ Done | Active nav items, buttons, highlights |
| Glass morphism | ✅ Done | Frosted glass panels (iOS-style) |
| Sans-serif font | ✅ Done | Geist Sans (Next.js default) |
| Clean card layout | ✅ Done | White cards with subtle shadows |

---

## 📞 Official Contact Info (for footer)

- **Phone:** 09610 20 40 20
- **Email:** helpdeskbangladesh@whirlpool.com
- **Website:** https://www.whirlpool-bangladesh.com
- **Copyright:** © 2022 Whirlpool Of Bangladesh. All Rights Reserved.

---

*This document is the single source of truth for Whirlpool branding in the WBL-WH project.*
