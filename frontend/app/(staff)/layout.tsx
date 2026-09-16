import DesktopSidebar from "../components/layout/DesktopSidebar";
import AppContentWrapper from "../components/layout/AppContentWrapper";
import MobileTopHeader from "../components/layout/MobileTopHeader";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import ToastNotifications from "../components/ui/ToastNotifications";
import ConfirmDialogHost from "../components/ui/ConfirmDialog";

/* Staff layout: authenticated shell. Only staff routes render the
   sidebar/header/nav + toasts/confirm. Public routes stay bare. */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DesktopSidebar />
      <AppContentWrapper>
        <MobileTopHeader />
        <main id="contenido" className="mx-auto w-full max-w-md px-4 pb-32 pt-4 lg:max-w-6xl lg:px-8">
          {children}
        </main>
      </AppContentWrapper>
      <MobileBottomNav />
      <ToastNotifications />
      <ConfirmDialogHost />
    </>
  );
}
