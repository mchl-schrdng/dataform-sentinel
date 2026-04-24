import { Header } from "@/components/app-shell/header";
import { SleepyCat } from "@/components/shared/sleepy-cat";
import { getConfig, getServiceAccount, isMockMode } from "@/lib/config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const config = getConfig();
  const serviceAccount = getServiceAccount();
  const mock = isMockMode();
  return (
    <div className="flex min-h-screen flex-col">
      <Header targets={config.targets} serviceAccount={serviceAccount} mock={mock} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <SleepyCat />
    </div>
  );
}
