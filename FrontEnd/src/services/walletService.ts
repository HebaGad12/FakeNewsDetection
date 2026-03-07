import apiClient from "./apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalletResponse {
  walletId: string;
  userId: string;
  userName: string;
  balance: number;
  updatedAt: string;
}

export interface WalletTransactionResponse {
  id: string;
  amount: number;
  type: string;
  description: string;
  actorName: string;
  createdAt: string;
}

export interface SendDonationRequest {
  recipientId: string;
  amount: number;
  message?: string;
}

export interface SendDonationResponse {
  message: string;
  donationId: string;
  amount: number;
  recipientName: string;
  newBalance: number;
}

export interface DonationRecord {
  id: string;
  amount: number;
  message?: string;
  senderName?: string;
  recipientName?: string;
  createdAt: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class WalletService {
  /** Get the current user's wallet (balance, etc.) */
  async getMyWallet(): Promise<WalletResponse> {
    return await apiClient.get<WalletResponse>("/donations/my-wallet");
  }

  /** Get the current user's wallet transaction history */
  async getMyTransactions(): Promise<WalletTransactionResponse[]> {
    return await apiClient.get<WalletTransactionResponse[]>("/donations/my-wallet/transactions");
  }

  /** Send a donation to another user/journalist */
  async sendDonation(data: SendDonationRequest): Promise<SendDonationResponse> {
    return await apiClient.post<SendDonationResponse>("/donations/send", data);
  }

  /** Get donations the current user has sent */
  async getSentDonations(): Promise<DonationRecord[]> {
    return await apiClient.get<DonationRecord[]>("/donations/sent");
  }

  /** Get donations the current user has received */
  async getReceivedDonations(): Promise<DonationRecord[]> {
    return await apiClient.get<DonationRecord[]>("/donations/received");
  }
}

export const walletService = new WalletService();
export default walletService;
