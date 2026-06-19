# Vetify Landing Page Design Reference

This document is a visual and structural reference for the website landing page, not a new application route.

## Design goals

- Clean, modern, pet-health focused experience
- Blue-first palette for trust, calm, and clarity
- Simple sections with clear calls to action
- Responsive layout that works on desktop and mobile

## Color palette

- `brand-50`: `#eff6ff`
- `brand-100`: `#dbeafe`
- `brand-500`: `#3b82f6`
- `brand-600`: `#2563eb`
- `brand-700`: `#1d4ed8`
- `brand-900`: `#1e3a8a`

Supporting neutrals:

- `slate-50`: `#f8fafc`
- `slate-100`: `#f1f5f9`
- `slate-200`: `#e2e8f0`
- `slate-600`: `#475569`
- `slate-900`: `#0f172a`

## Typography

- Headline: `font-extrabold`, `text-4xl` / `text-5xl`
- Subheadline: `text-lg`, `leading-8`, `text-slate-600`
- Body: `text-base`, `text-slate-700`
- Buttons: `font-semibold`, `rounded-full`, `px-6 py-3`

## Layout structure

1. Page wrapper: `min-h-screen bg-slate-50 text-slate-900`
2. Header: `border-b border-slate-200 bg-white/90 backdrop-blur-sm`
3. Hero section: two-column on desktop, stacked on mobile
4. Feature cards: 3 or 4 cards with short benefit copy
5. Footer: simple copyright and link row

## Hero section reference

- Headline: “Vetify helps you keep your pet happy, healthy, and thriving.”
- Subtext: “From nutrition guidance to symptom triage and local vet locations, Vetify brings AI-powered pet care tools together in one place.”
- Primary CTA: `Start care` / `bg-brand-700 text-white`
- Secondary CTA: `Explore features` / `border border-slate-300 bg-white text-slate-700`
- Visual accent panel: soft blue gradient, rounded corners, shadow

## Example section layout

### Header

- Logo: `Vetify`
- Nav: `Landing`, `Chat`, `Map`
- Action: `Open App`

### Hero

- `div.grid gap-10 lg:grid-cols-[1.1fr_0.9fr]`
- Left: headline, summary, CTA buttons
- Right: feature summary card or visual panel

### Features

- Section title: `text-3xl font-bold`
- Cards grid: `grid gap-6 md:grid-cols-3`
- Card style: `rounded-3xl border border-slate-200 bg-white p-6 shadow-sm`

### Footer

- `border-t border-slate-200 bg-white py-8`
- Small text, centered or left-aligned

## Component reference

- `Header` — logo + nav + primary action
- `Hero` — hero block with CTA buttons
- `FeatureCard` — a reusable card for benefits
- `Footer` — simple copyright and support links

## Notes

- Use the current Tailwind theme colors from `tailwind.config.ts`.
- Keep spacing generous and maintain high contrast for buttons.
- Keep the design consistent with your existing `apps/web/src/app/page.tsx` brand level.

## Recommended next step

Build the landing page in `apps/web/src/app/page.tsx` or another existing route, using this document as the design reference.
