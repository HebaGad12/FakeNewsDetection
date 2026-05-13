import apiClient from "./apiClient";

export interface OrgFinanceWalletResponse {
  walletId: string;
  userId: string;
  userName: string;
  email: string;
  licenceNumber: string;
  role: string;
  isActive: boolean;
  balance: number;
  updatedAt: string;
  transactionCount: number;
}

export interface OrgFinanceAdjustRequest {
  userId: string;
  amount: number;
  description?: string;
}

export interface OrgFinanceAdjustResponse {
  message: string;
  userId: string;
  userName: string;
  newBalance: number;
}

class OrganizationFinanceService {
  async getTeamWallets(orgUserId: string): Promise<OrgFinanceWalletResponse[]> {
    return await apiClient.get<OrgFinanceWalletResponse[]>(`/organizations/${orgUserId}/finance/wallets`);
  }

  async getTeamWalletTransactions(orgUserId: string, userId: string) {
    return await apiClient.get<any[]>(`/organizations/${orgUserId}/finance/wallets/${userId}/transactions`);
  }

  async adjustTeamWallet(orgUserId: string, data: OrgFinanceAdjustRequest): Promise<OrgFinanceAdjustResponse> {
    return await apiClient.post<OrgFinanceAdjustResponse>(`/organizations/${orgUserId}/finance/adjust`, data);
  }
}

export const organizationFinanceService = new OrganizationFinanceService();
export default organizationFinanceService;