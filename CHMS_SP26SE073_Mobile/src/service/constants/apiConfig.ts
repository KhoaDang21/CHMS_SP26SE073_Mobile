export const apiConfig = {
  baseURL: "http://163.227.230.54:8088",
  timeout: 15000,
  endpoints: {
    auth: {
      login: "/api/Auth/login",
      register: "/api/Auth/register",
      logout: "/api/Auth/logout",
      refreshToken: "/api/Auth/refresh-token",
      profile: "/api/users/profile",
    },
    homestays: {
      list: "/api/homestays",
      detail: (id: string) => `/api/homestays/${id}`,
    },
    bookings: {
      list: "/api/bookings",
      detail: (id: string) => `/api/bookings/${id}`,
      create: "/api/bookings",
      cancel: (id: string) => `/api/bookings/${id}/cancel`,
      calculate: "/api/bookings/calculate",
    },
    wishlist: {
      list: "/api/wishlist",
      add: (homestayId: string) => `/api/wishlist/${homestayId}`,
      remove: (homestayId: string) => `/api/wishlist/${homestayId}`,
    },
    payment: {
      createLink: "/api/payment/create-link",
    },
    profile: {
      get: "/api/users/profile",
      update: "/api/users/profile",
    },
  },
};
