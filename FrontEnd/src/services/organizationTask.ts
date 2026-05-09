import apiClient from "./apiClient";

export interface TaskComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface OrganizationTaskResponse {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  organizationName: string;
  assignedJournalistId: string;
  assignedJournalistName: string;
  comments: TaskComment[];
}

export interface OrganizationTaskDashboardResponse {
  totalActive: number;
  completed: number;
  pendingReview: number;
  cancelled: number;
  totalTasks: number;
  journalistPerformance: {
    journalistId: string;
    journalistName: string;
    totalAssigned: number;
    completed: number;
    inProgress: number;
    pendingReview: number;
    completionRate: number;
  }[];
}

export interface CreateOrganizationTaskRequest {
  title: string;
  description: string;
  assignedJournalistId: string;
  priority: number;
  deadline: string;
}

export interface UpdateOrganizationTaskRequest {
  title: string;
  description: string;
  priority: number;
  deadline: string;
}

class OrganizationTaskService {
  async getTasks(status?: number, priority?: number, journalistId?: string): Promise<OrganizationTaskResponse[]> {
    const params: Record<string, number | string> = {};
    if (status !== undefined) params.status = status;
    if (priority !== undefined) params.priority = priority;
    if (journalistId) params.journalistId = journalistId;
    return await apiClient.get<OrganizationTaskResponse[]>("/organizations/tasks", { params });
  }

  async getTask(taskId: string): Promise<OrganizationTaskResponse> {
    return await apiClient.get<OrganizationTaskResponse>(`/organizations/tasks/${taskId}`);
  }

  async createTask(data: CreateOrganizationTaskRequest): Promise<OrganizationTaskResponse> {
    return await apiClient.post<OrganizationTaskResponse>("/organizations/tasks", data);
  }

  async updateTask(taskId: string, data: UpdateOrganizationTaskRequest): Promise<OrganizationTaskResponse> {
    return await apiClient.put<OrganizationTaskResponse>(`/organizations/tasks/${taskId}`, data);
  }

  async deleteTask(taskId: string): Promise<void> {
    return await apiClient.delete(`/organizations/tasks/${taskId}`);
  }

  async updateTaskStatus(taskId: string, newStatus: number): Promise<OrganizationTaskResponse> {
    return await apiClient.patch<OrganizationTaskResponse>(`/organizations/tasks/${taskId}/status`, { newStatus });
  }

  async addComment(taskId: string, content: string): Promise<void> {
    return await apiClient.post(`/organizations/tasks/${taskId}/comments`, { content });
  }

  async getDashboard(): Promise<OrganizationTaskDashboardResponse> {
    return await apiClient.get<OrganizationTaskDashboardResponse>("/organizations/tasks/dashboard");
  }
}

export const organizationTaskService = new OrganizationTaskService();
export default organizationTaskService;
