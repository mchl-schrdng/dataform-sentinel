import { Header } from "@/components/app-shell/header";
import { SleepyCat } from "@/components/shared/sleepy-cat";
import { getConfig, getServiceAccount, isMockMode } from "@/lib/config";
import { getCatMood } from "@/lib/dataform/cat-signal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = getConfig();
  const serviceAccount = getServiceAccount();
  const mock = isMockMode();
  const catMood = await getCatMood();
  return (
    <div className="flex min-h-screen flex-col">
      <Header targets={config.targets} serviceAccount={serviceAccount} mock={mock} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <SleepyCat mood={catMood} />
    </div>
  );
}
