import api from './api';

export interface Review {
  id: string;
  service_id: string;
  student_id: string;
  student_name: string;
  rating: number;
  review_text: string;
  safety_rating: number;
  verified_booking: boolean;
  created_at: string;
  provider_response?: string;
}

export interface CreateReviewData {
  service_id: string;
  rating: number;
  review_text: string;
  safety_rating: number;
}

export const reviewsService = {
  getServiceReviews: async (serviceId: string): Promise<Review[]> => {
    const response = await api.get(`/reviews/service/${serviceId}`);
    return response.data;
  },

  createReview: async (data: CreateReviewData): Promise<Review> => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
};
