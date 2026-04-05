import apiClient from "./apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalletSummary {
  walletId: string;
  userId: string;
  userName: string;
  balance: number;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description?: string;
  actorName: string;
  createdAt: string;
}

export interface AdjustBalanceRequest {
  userId: string;
  amount: number;
  description?: string; 
}

// ─── Service ─────────────────────────────────────────────────────────────────

class AdminWalletService {
  /** Get all wallets */
  async getAllWallets(): Promise<WalletSummary[]> {
    return await apiClient.get<WalletSummary[]>("/admin/wallets");
  }

  /** Get a single user's wallet */
  async getWallet(userId: string): Promise<WalletSummary> {
    return await apiClient.get<WalletSummary>(`/admin/wallets/${userId}`);
  }

  /** Get transaction history for a user's wallet */
  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    return await apiClient.get<WalletTransaction[]>(`/admin/wallets/${userId}/transactions`);
  }

  /** Adjust a user's wallet balance */
  async adjustBalance(data: AdjustBalanceRequest): Promise<void> {
    await apiClient.post<void>("/admin/wallets/adjust",{...data, description: data.description || undefined});
  }
}

export const adminWalletService = new AdminWalletService();
export default adminWalletService;