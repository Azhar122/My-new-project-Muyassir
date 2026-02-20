import api from './api';
import { Contract, Payment, ProviderEarnings } from '../types';

export interface CreateContractData {
  service_id: string;
  start_date: string;
  duration_months: number;
}

export interface MakePaymentData {
  contract_id: string;
  amount: number;
  payment_method: string;
}

export const contractsService = {
  // Create a new contract
  createContract: async (data: CreateContractData): Promise<Contract> => {
    const response = await api.post('/contracts', data);
    return response.data;
  },

  // Get student's contracts
  getStudentContracts: async (): Promise<Contract[]> => {
    const response = await api.get('/contracts/student/my-contracts');
    return response.data;
  },

  // Get provider's contracts
  getProviderContracts: async (): Promise<Contract[]> => {
    const response = await api.get('/contracts/provider/my-contracts');
    return response.data;
  },

  // Get contracts for a specific service
  getServiceContracts: async (serviceId: string): Promise<Contract[]> => {
    const response = await api.get(`/contracts/service/${serviceId}`);
    return response.data;
  },

  // Get single contract details
  getContract: async (contractId: string): Promise<Contract> => {
    const response = await api.get(`/contracts/${contractId}`);
    return response.data;
  },

  // Provider accepts contract
  providerAccept: async (contractId: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${contractId}/provider-accept`);
    return response.data;
  },

  // Provider rejects contract
  providerReject: async (contractId: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${contractId}/provider-reject`);
    return response.data;
  },

  // Student confirms contract (after provider approval)
  studentConfirm: async (contractId: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${contractId}/student-confirm`);
    return response.data;
  },

  // Legacy sign endpoint
  signContract: async (contractId: string): Promise<Contract> => {
    const response = await api.post(`/contracts/${contractId}/sign`);
    return response.data;
  },

  // Cancel a contract
  cancelContract: async (contractId: string): Promise<Contract> => {
    const response = await api.put(`/contracts/${contractId}/cancel`);
    return response.data;
  },

  // Mark contract as completed (student only)
  completeContract: async (contractId: string): Promise<Contract> => {
    const response = await api.put(`/contracts/${contractId}/complete`);
    return response.data;
  },

  // Make a payment
  makePayment: async (data: MakePaymentData): Promise<Payment> => {
    const response = await api.post('/payments', data);
    return response.data;
  },

  // Get payments for a contract
  getContractPayments: async (contractId: string): Promise<Payment[]> => {
    const response = await api.get(`/payments/contract/${contractId}`);
    return response.data;
  },

  // Get provider earnings
  getProviderEarnings: async (): Promise<ProviderEarnings> => {
    const response = await api.get('/payments/provider/earnings');
    return response.data;
  },
};
