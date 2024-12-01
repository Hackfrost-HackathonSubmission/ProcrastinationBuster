export interface FocusSession {
  userId: string;
  duration: number;
  isCompleted: boolean;
  taskTitle: string;
  startTime: Date;
  endTime: Date;
}

export class KestraService {
  private static instance: KestraService;
  private readonly apiUrl: string;

  private constructor() {
    this.apiUrl =
      process.env.NEXT_PUBLIC_KESTRA_API_URL || "http://localhost:8080";
  }

  static getInstance(): KestraService {
    if (!KestraService.instance) {
      KestraService.instance = new KestraService();
    }
    return KestraService.instance;
  }

  async logFocusSession(session: FocusSession): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/executions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          namespace: "procrastination-buster",
          flowId: "focus-session-analytics",
          inputs: {
            session_data: session,
            admin_email: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to log focus session: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error logging focus session:", error);
      // Handle error appropriately
    }
  }

  async getAnalytics(): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/executions/last`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return null;
    }
  }
}
