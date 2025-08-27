export const endpoints = {
  auth: {
    sendOtp: "/auth/otp",
    verifyOtp: "/auth/verify",
    me: "/users/me",
    logout: "/auth/logout",
  },
  users: {
    me: "/users/me",
    updateProfile: "/users/me",
    subscription: "/users/me/subscription",
  },
  vehicles: {
    list: "/vehicles",
    byId: (id: string) => `/vehicles/${id}`,
    assignDriver: (id: string) => `/vehicles/${id}/assign-driver`,
    unassignDriver: (id: string) => `/vehicles/${id}/unassign-driver`,
    documents: (id: string) => `/vehicles/${id}/documents`,
  },
  drivers: {
    list: "/drivers",
    byId: (id: string) => `/drivers/${id}`,
  },
  trips: {
    list: "/trips",
    byId: (id: string) => `/trips/${id}`,
    status: (id: string) => `/trips/${id}/status`,
  },
  transactions: {
    list: "/transactions",
    byId: (id: string) => `/transactions/${id}`,
    analytics: "/transactions/analytics",
  },
  wallets: {
    fuel: "/wallets/fuel",
  },
  fastag: {
    link: (vehicleId: string) => `/vehicles/${vehicleId}/fastag/link`,
  },
  challans: {
    list: (vehicleId: string) => `/vehicles/${vehicleId}/challans`,
    all: "/challans",
    pay: (challanId: string) => `/challans/${challanId}/pay`,
    details: (challanId: string) => `/challans/${challanId}`,
    bulkPay: "/challans/bulk-pay",
  },
  services: {
    list: (vehicleId: string) => `/vehicles/${vehicleId}/services`,
  },
  payments: {
    createOrder: "/payments/cashfree/order",
    verifyOrder: "/payments/cashfree/verify",
  },
  files: {
    upload: "/files",
  },
  paytap: {
    account: "/paytap/account",
    balance: "/paytap/balance",
    addMoney: "/paytap/add-money",
    transactions: "/paytap/transactions",
    cards: "/paytap/cards",
    orderCard: "/paytap/cards/order",
    assignCard: (vehicleId: string) => `/paytap/cards/assign/${vehicleId}`,
    transferMoney: "/paytap/transfer",
    cardSettings: (cardId: string) => `/paytap/cards/${cardId}/settings`,
    updateCardSettings: (cardId: string) => `/paytap/cards/${cardId}/settings`,
    blockCard: "/paytap/cards/block",
    unblockCard: (cardId: string) => `/paytap/cards/${cardId}/unblock`,
  },
};
