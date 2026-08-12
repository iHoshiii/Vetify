export type NavItem = {
  label: string;
  href: string;
};

export type ToolItem = NavItem & {
  desc: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/#home' },
  { label: 'About Us', href: '/#about' },
  { label: 'Services', href: '/services' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Contact Us', href: '/contact' },
];

export const TOOLS_ITEMS: ToolItem[] = [
  { label: '🥗 Meal Planner', href: '/planner', desc: 'Custom pet meal plans' },
  { label: '🦴 Anatomy', href: '/anatomy', desc: 'Explore pet anatomy' },
  { label: '❓ FAQs', href: '/help', desc: 'Common questions answered' },
];
