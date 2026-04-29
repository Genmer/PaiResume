import { adminApi } from './admin'

export const analyticsApi = {
  getTierDistribution: () => adminApi.getTierDistribution(),
  getSubscriptionTrends: (days?: number) => adminApi.getSubscriptionTrends(days),
  getConversionFunnel: () => adminApi.getConversionFunnel(),
  getCodeStats: () => adminApi.getAnalyticsCodeStats(),
  getAverageRemainingDays: () => adminApi.getAverageRemainingDays(),
  getRegistrationTrends: (days?: number) => adminApi.getRegistrationTrends(days),
}