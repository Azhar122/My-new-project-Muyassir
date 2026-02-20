import api from './api';

export const adminService = {
  // Pending verifications
  getPendingVerifications: async () => {
    const response = await api.get('/admin/pending-verifications');
    return response.data;
  },

  // Verify or reject user
  verifyUser: async (userId: string, decision: 'verified' | 'rejected', rejectionReason?: string) => {
    const response = await api.post('/admin/verify-user', {
      user_id: userId,
      decision,
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // List all users
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  // List all services
  getServices: async () => {
    const response = await api.get('/admin/services');
    return response.data;
  },

  // Suspend service
  suspendService: async (serviceId: string) => {
    const response = await api.put(`/admin/services/${serviceId}/suspend`);
    return response.data;
  },

  // Unsuspend service
  unsuspendService: async (serviceId: string) => {
    const response = await api.put(`/admin/services/${serviceId}/unsuspend`);
    return response.data;
  },

  // List all contracts
  getContracts: async () => {
    const response = await api.get('/admin/contracts');
    return response.data;
  },
};
