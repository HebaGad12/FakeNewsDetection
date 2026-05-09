import apiClient from "./apiClient";
import { TaskComment, OrganizationTaskResponse as JournalistTaskResponse } from "./organizationTask";

export type { TaskComment, JournalistTaskResponse };

class JournalistTaskService {
  async getTasks(status?: number, priority?: number): Promise<JournalistTaskResponse[]> {
    const params: Record<string, number> = {};
    if (status !== undefined) params.status = status;
    if (priority !== undefined) params.priority = priority;
    return await apiClient.get<JournalistTaskResponse[]>("/journalists/tasks", { params });
  }

  async getTask(taskId: string): Promise<JournalistTaskResponse> {
    return await apiClient.get<JournalistTaskResponse>(`/journalists/tasks/${taskId}`);
  }

  async updateTaskStatus(taskId: string, newStatus: number): Promise<JournalistTaskResponse> {
    return await apiClient.patch<JournalistTaskResponse>(`/journalists/tasks/${taskId}/status`, { newStatus });
  }

  async addComment(taskId: string, content: string): Promise<void> {
    return await apiClient.post(`/journalists/tasks/${taskId}/comments`, { content });
  }
}

export const journalistTaskService = new JournalistTaskService();
export default journalistTaskService;
