/**
 * Customer (mobile) API paths — aligned with FE `src/config/apiConfig.ts`
 */
export const apiConfig = {
  baseURL: "https://api.chms.io.vn",
  timeout: 15000,
  endpoints: {
    auth: {
      login: "/api/auth/login",
      register: "/api/auth/register",
      logout: "/api/auth/logout",
      forgotPassword: "/api/auth/forgot-password",
      resetPassword: "/api/auth/reset-password",
      refreshToken: "/api/auth/refresh-token",
      verifyOtp: "/api/auth/verify-otp",
      googleLogin: "/api/auth/google-login",
    },
    homestays: {
      list: "/api/homestays",
      search: "/api/homestays/search",
      detail: (id: string) => `/api/homestays/${id}`,
      reviews: (id: string) => `/api/homestays/${id}/reviews`,
    },
    publicHomestays: {
      reviews: (homestayId: string) =>
        `/api/public/homestays/${homestayId}/reviews`,
    },
    bookings: {
      list: "/api/bookings",
      detail: (id: string) => `/api/bookings/${id}`,
      create: "/api/bookings",
      cancel: (id: string) => `/api/bookings/${id}/cancel`,
      calculate: "/api/bookings/calculate",
      modify: (id: string) => `/api/bookings/${id}/modify`,
      cancellationPolicy: (id: string) =>
        `/api/bookings/${id}/cancellation-policy`,
      specialRequests: (id: string) => `/api/bookings/${id}/special-requests`,
    },
    wishlist: {
      list: "/api/wishlist",
      add: (homestayId: string) => `/api/wishlist/${homestayId}`,
      remove: (homestayId: string) => `/api/wishlist/${homestayId}`,
      recentlyViewed: "/api/recently-viewed",
    },
    payments: {
      createLink: "/api/payment/create-link",
      webhook: "/api/payment/webhook",
      detail: (id: string) => `/api/payment/${id}`,
      history: "/api/payment/history",
    },
    profile: {
      get: "/api/users/profile",
      update: "/api/users/profile",
      changePassword: "/api/users/profile/password",
    },
    reviews: {
      create: "/api/reviews",
      myReviews: "/api/reviews/my-reviews",
      update: (id: string) => `/api/reviews/${id}`,
      delete: (id: string) => `/api/reviews/${id}`,
    },
    notifications: {
      list: "/api/notifications",
      unreadCount: "/api/notifications/unread-count",
      markRead: (id: string) => `/api/notifications/${id}/read`,
      markAllRead: "/api/notifications/read-all",
      delete: (id: string) => `/api/notifications/${id}`,
      settings: "/api/notifications/settings",
    },
    supportTickets: {
      create: "/api/support/tickets",
      list: "/api/support/tickets",
      detail: (id: string) => `/api/support/tickets/${id}`,
      sendMessage: (ticketId: string) =>
        `/api/support/tickets/${ticketId}/messages`,
      close: (id: string) => `/api/support/tickets/${id}/close`,
    },
    ai: {
      chat: "/api/ai/chat",
      chatHistory: "/api/ai/chat/history",
      deleteChatHistory: "/api/ai/chat/history",
      recommendations: "/api/ai/recommendations",
      faq: "/api/ai/faq",
      askFaq: "/api/ai/faq/ask",
    },
    districts: {
      list: "/api/districts",
    },
    promotions: {
      activeForCustomer: "/api/promotions/active",
    },
    coupons: {
      validate: "/api/coupons/validate",
    },
    experiences: {
      list: "/api/experiences",
      listByCategory: (category: string) =>
        `/api/experiences?category=${category}`,
      detail: (id: string) => `/api/experiences/${id}`,
    },
    extraCharges: {
      byBooking: (bookingId: string) =>
        `/api/extra-charges/booking/${bookingId}`,
    },
  },
};
