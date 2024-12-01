// src/services/kestraService.ts
import { TimerSession, SessionStats } from "@/types/timer";

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

  async logTimerSession(session: TimerSession): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/executions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          namespace: "procrastination-buster",
          flowId: "focus-timer-session",
          inputs: {
            userId: session.userId,
            taskTitle: session.taskTitle,
            duration: session.duration,
            actualDuration: session.actualDuration,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            completed: session.completed,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to log timer session: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error logging timer session:", error);
      throw error;
    }
  }

  // Add method to get session stats
  async getSessionStats(userId: string): Promise<SessionStats | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/executions/search?namespace=procrastination-buster&flowId=focus-timer-session&state=SUCCESS`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch session stats: ${response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching session stats:", error);
      return null;
    }
  }
}
