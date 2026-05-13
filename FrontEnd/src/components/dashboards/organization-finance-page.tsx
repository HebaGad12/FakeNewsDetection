import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Clock3,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import organizationFinanceService, {
  type OrgFinanceWalletResponse,
} from "@/services/organizationFinanceService";
import type { OrgWalletResponse, OrgWalletTransactionResponse } from "@/services/organizationService";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-500 mb-3">
        {icon}
        <span className="text-xs font-mono uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{sub}</p>
    </div>
  );
}

export function OrganizationFinancePage({
  orgId,
  organizationWallet,
}: {
  orgId: string;
  organizationWallet?: OrgWalletResponse | null;
}) {
  const [wallets, setWallets] = useState<OrgFinanceWalletResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<OrgFinanceWalletResponse | null>(null);
  const [transactions, setTransactions] = useState<OrgWalletTransactionResponse[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [adjustWallet, setAdjustWallet] = useState<OrgFinanceWalletResponse | null>(null);
  const [adjustMode, setAdjustMode] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  const loadWallets = async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const data = await organizationFinanceService.getTeamWallets(orgId);
      setWallets(data);
    } catch {
      setLoadError("Failed to load team finances. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallets();
  }, [orgId]);

  const filteredWallets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return wallets;

    return wallets.filter((wallet) => {
      return (
        wallet.userName.toLowerCase().includes(query) ||
        wallet.email.toLowerCase().includes(query) ||
        wallet.licenceNumber.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, wallets]);

  const activeWallets = wallets.filter((wallet) => wallet.isActive).length;
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const organizationBalance = organizationWallet?.balance ?? 0;

  const openHistory = async (wallet: OrgFinanceWalletResponse) => {
    setSelectedWallet(wallet);
    setTransactions([]);
    setTransactionsLoading(true);

    try {
      const data = await organizationFinanceService.getTeamWalletTransactions(orgId, wallet.userId);
      setTransactions(data);
    } catch {
      toast.error("Failed to load wallet history.");
    } finally {
      setTransactionsLoading(false);
    }
  };

  const submitAdjust = async () => {
    if (!adjustWallet) return;

    const parsedAmount = Number.parseFloat(adjustAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount greater than zero.");
      return;
    }

    setAdjustLoading(true);
    try {
      const signedAmount = adjustMode === "credit" ? parsedAmount : -parsedAmount;
      await organizationFinanceService.adjustTeamWallet(orgId, {
        userId: adjustWallet.userId,
        amount: signedAmount,
        description: adjustDescription.trim() || undefined,
      });

      toast.success(`${adjustMode === "credit" ? "Topped up" : "Deducted"} ${adjustWallet.userName}`);
      setAdjustWallet(null);
      setAdjustAmount("");
      setAdjustDescription("");
      await loadWallets();

      if (selectedWallet?.userId === adjustWallet.userId) {
        void openHistory(adjustWallet);
      }
    } catch (error: unknown) {
      const response = error as { response?: { data?: string | { message?: string } } };
      const message =
        typeof response?.response?.data === "string"
          ? response.response.data
          : response?.response?.data?.message;
      toast.error(message ?? "Failed to update wallet balance.");
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Organization Wallet"
          value={formatCurrency(organizationBalance)}
          icon={<Wallet className="h-4 w-4" />}
          sub="The organization treasury available for internal allocations."
        />
        <StatCard
          label="Team Wallets"
          value={formatCurrency(totalBalance)}
          icon={<BadgeDollarSign className="h-4 w-4" />}
          sub="Combined balances for journalists assigned to this organization."
        />
        <StatCard
          label="Active Journalists"
          value={String(activeWallets)}
          icon={<ShieldCheck className="h-4 w-4" />}
          sub="Only journalists linked to your organization are shown here."
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Team Finances</h2>
            <p className="text-sm text-zinc-500">Manage the wallets for journalists in your organization only.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or licence number"
                className="h-11 pl-11"
              />
            </div>
            <Button variant="outline" onClick={loadWallets} className="h-11 gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading finances...
          </div>
        ) : loadError ? (
          <div className="p-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">Unable to load team finances</p>
                  <p className="text-sm text-red-600/80">{loadError}</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-500">
            <UserRound className="h-10 w-10 opacity-30" />
            <p className="font-medium">No journalists match your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {filteredWallets.map((wallet) => (
              <div key={wallet.userId} className="grid gap-4 p-5 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-bold text-zinc-700">
                    {wallet.userName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-900">{wallet.userName}</h3>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]",
                          wallet.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                        )}
                      >
                        {wallet.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="truncate text-sm text-zinc-500">{wallet.email}</p>
                    <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-zinc-400">
                      Licence {wallet.licenceNumber || "N/A"} · {wallet.role}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1 lg:gap-2">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Balance</p>
                    <p className="mt-1 font-semibold text-zinc-900">{formatCurrency(wallet.balance)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Transactions</p>
                    <p className="mt-1 font-semibold text-zinc-900">{wallet.transactionCount}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3 sm:col-span-1 lg:col-span-1">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Updated</p>
                    <p className="mt-1 font-semibold text-zinc-900">{formatDate(wallet.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button variant="outline" className="gap-2" onClick={() => void openHistory(wallet)}>
                    <History className="h-4 w-4" /> History
                  </Button>
                  <Button className="gap-2" onClick={() => setAdjustWallet(wallet)}>
                    <BadgeDollarSign className="h-4 w-4" /> Adjust
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-zinc-200 p-5">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Wallet History</p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-900">{selectedWallet.userName}</h3>
                  <p className="text-sm text-zinc-500">{selectedWallet.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedWallet(null);
                    setTransactions([]);
                  }}
                  className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading history...
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {transactions.map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <div
                          key={tx.id}
                          className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4"
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                              isCredit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}
                          >
                            {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-zinc-900">{tx.type}</p>
                              <span className="text-xs uppercase tracking-[0.18em] text-zinc-400">{formatDateTime(tx.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-500">{tx.description}</p>
                            {tx.actorName && <p className="mt-1 text-xs text-zinc-400">By {tx.actorName}</p>}
                          </div>
                          <div className={cn("text-sm font-bold tabular-nums", isCredit ? "text-emerald-600" : "text-rose-600")}>
                            {isCredit ? "+" : ""}{formatCurrency(tx.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-500">
                    <Clock3 className="h-10 w-10 opacity-30" />
                    <p>No transactions yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adjustWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-zinc-200 p-5">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Adjust Wallet</p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-900">{adjustWallet.userName}</h3>
                  <p className="text-sm text-zinc-500">Current balance {formatCurrency(adjustWallet.balance)}</p>
                </div>
                <button
                  onClick={() => {
                    setAdjustWallet(null);
                    setAdjustAmount("");
                    setAdjustDescription("");
                    setAdjustMode("credit");
                  }}
                  className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                  <button
                    onClick={() => setAdjustMode("credit")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      adjustMode === "credit" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                    )}
                  >
                    Top up
                  </button>
                  <button
                    onClick={() => setAdjustMode("debit")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                      adjustMode === "debit" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                    )}
                  >
                    Deduct
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700">Description</label>
                  <Input
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    placeholder="Optional note for this adjustment"
                  />
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  {adjustMode === "credit" ? "This will increase the wallet balance." : "This will decrease the wallet balance."}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setAdjustWallet(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 gap-2" disabled={adjustLoading} onClick={() => void submitAdjust()}>
                    {adjustLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
