// extension-src/managers/ProductivityAnalytics.js

export class ProductivityAnalytics {
  constructor() {
    this.analyticsData = null;
    this.initialized = false;
    this.retentionPeriod = 30; // days to keep data
  }

  static getInstance() {
    if (!ProductivityAnalytics.instance) {
      ProductivityAnalytics.instance = new ProductivityAnalytics();
    }
    return ProductivityAnalytics.instance;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadAnalyticsData();
      await this.cleanupOldData();
      this.setupAutoSave();
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize ProductivityAnalytics:", error);
      throw error;
    }
  }

  async loadAnalyticsData() {
    const data = await chrome.storage.local.get("analyticsData");
    this.analyticsData = data.analyticsData || {
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
      trends: {},
      goals: {},
      sessionHistory: [],
    };
  }

  setupAutoSave() {
    // Auto-save analytics data every 5 minutes
    setInterval(() => this.saveAnalyticsData(), 5 * 60 * 1000);
  }

  async saveAnalyticsData() {
    try {
      await chrome.storage.local.set({ analyticsData: this.analyticsData });
    } catch (error) {
      console.error("Failed to save analytics data:", error);
    }
  }

  async recordSession(session) {
    const date = new Date().toISOString().split("T")[0];
    const sessionData = {
      ...session,
      timestamp: Date.now(),
      date,
    };

    // Update session history
    this.analyticsData.sessionHistory.push(sessionData);

    // Update daily stats
    if (!this.analyticsData.dailyStats[date]) {
      this.analyticsData.dailyStats[date] = this.createDailyStatsTemplate();
    }

    this.updateDailyStats(date, session);
    this.updateWeeklyStats(date, session);
    this.updateMonthlyStats(date, session);
    this.updateTrends();

    await this.saveAnalyticsData();
  }

  createDailyStatsTemplate() {
    return {
      totalFocusTime: 0,
      totalBreakTime: 0,
      completedSessions: 0,
      interruptedSessions: 0,
      productivity: 0,
      distractions: 0,
      startTime: null,
      endTime: null,
      hourlyBreakdown: Array(24).fill(0),
      tags: {},
      goals: {
        achieved: 0,
        total: 0,
      },
    };
  }

  updateDailyStats(date, session) {
    const stats = this.analyticsData.dailyStats[date];

    if (session.type === "focus") {
      stats.totalFocusTime += session.duration;
      if (session.completed) {
        stats.completedSessions++;
      } else {
        stats.interruptedSessions++;
      }
    } else {
      stats.totalBreakTime += session.duration;
    }

    // Update hourly breakdown
    const hour = new Date(session.timestamp).getHours();
    stats.hourlyBreakdown[hour] += session.duration;

    // Update tags
    if (session.tags) {
      session.tags.forEach((tag) => {
        stats.tags[tag] = (stats.tags[tag] || 0) + session.duration;
      });
    }

    // Calculate productivity score
    stats.productivity = this.calculateProductivityScore(stats);
  }

  updateWeeklyStats(date, session) {
    const weekKey = this.getWeekKey(date);
    if (!this.analyticsData.weeklyStats[weekKey]) {
      this.analyticsData.weeklyStats[weekKey] = {
        totalFocusTime: 0,
        averageProductivity: 0,
        completedSessions: 0,
        daysActive: new Set(),
      };
    }

    const weekStats = this.analyticsData.weeklyStats[weekKey];
    if (session.type === "focus") {
      weekStats.totalFocusTime += session.duration;
      if (session.completed) weekStats.completedSessions++;
    }
    weekStats.daysActive.add(date);
    weekStats.averageProductivity = this.calculateAverageProductivity(weekKey);
  }

  updateMonthlyStats(date, session) {
    const monthKey = date.substring(0, 7); // YYYY-MM
    if (!this.analyticsData.monthlyStats[monthKey]) {
      this.analyticsData.monthlyStats[monthKey] = {
        totalFocusTime: 0,
        averageProductivity: 0,
        completedSessions: 0,
        daysActive: new Set(),
        bestDay: null,
        worstDay: null,
      };
    }

    const monthStats = this.analyticsData.monthlyStats[monthKey];
    if (session.type === "focus") {
      monthStats.totalFocusTime += session.duration;
      if (session.completed) monthStats.completedSessions++;
    }
    monthStats.daysActive.add(date);
    this.updateMonthlyBestWorstDays(monthKey);
  }

  updateTrends() {
    this.analyticsData.trends = {
      productivity: this.calculateProductivityTrend(),
      focusTime: this.calculateFocusTimeTrend(),
      consistency: this.calculateConsistencyTrend(),
    };
  }

  calculateProductivityScore(stats) {
    const completionRate =
      stats.completedSessions /
        (stats.completedSessions + stats.interruptedSessions) || 0;
    const focusTimeWeight = Math.min(stats.totalFocusTime / (8 * 60), 1); // 8 hours max
    return Math.round((completionRate * 0.7 + focusTimeWeight * 0.3) * 100);
  }

  calculateAverageProductivity(weekKey) {
    const days = Array.from(this.analyticsData.weeklyStats[weekKey].daysActive);
    if (days.length === 0) return 0;

    const totalProductivity = days.reduce((sum, day) => {
      return sum + (this.analyticsData.dailyStats[day]?.productivity || 0);
    }, 0);

    return Math.round(totalProductivity / days.length);
  }

  updateMonthlyBestWorstDays(monthKey) {
    const monthStats = this.analyticsData.monthlyStats[monthKey];
    const days = Array.from(monthStats.daysActive);

    if (days.length === 0) return;

    const dayStats = days.map((day) => ({
      date: day,
      productivity: this.analyticsData.dailyStats[day].productivity,
    }));

    monthStats.bestDay = dayStats.reduce((best, current) =>
      current.productivity > (best?.productivity || 0) ? current : best
    );

    monthStats.worstDay = dayStats.reduce((worst, current) =>
      current.productivity < (worst?.productivity || Infinity) ? current : worst
    );
  }

  async getProductivityReport(timeframe = "day") {
    const date = new Date().toISOString().split("T")[0];

    switch (timeframe) {
      case "day":
        return this.getDailyReport(date);
      case "week":
        return this.getWeeklyReport(this.getWeekKey(date));
      case "month":
        return this.getMonthlyReport(date.substring(0, 7));
      default:
        throw new Error("Invalid timeframe");
    }
  }

  async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPeriod);

    // Clean up old sessions
    this.analyticsData.sessionHistory =
      this.analyticsData.sessionHistory.filter(
        (session) => session.timestamp > cutoffDate.getTime()
      );

    // Clean up old daily stats
    for (const date in this.analyticsData.dailyStats) {
      if (new Date(date) < cutoffDate) {
        delete this.analyticsData.dailyStats[date];
      }
    }

    await this.saveAnalyticsData();
  }

  getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }
}

export default ProductivityAnalytics;
