/* AppContentWrapper: reserves DesktopSidebar space (lg:pl-64).
   Only rendered inside app/(staff)/layout.tsx, so every page here is
   authenticated — no public-route check needed. */
export default function AppContentWrapper({ children }: { children: React.ReactNode }) {
  return <div className="lg:pl-64">{children}</div>;
}
