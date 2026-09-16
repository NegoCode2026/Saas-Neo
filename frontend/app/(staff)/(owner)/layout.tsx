import OwnerGuard from "../../components/auth/OwnerGuard";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerGuard>{children}</OwnerGuard>;
}
