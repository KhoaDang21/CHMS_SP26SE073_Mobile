import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface Review {
  id: string;
  homestayId: string;
  homestayName: string;
  homestayImage?: string;
  bookingReference: string;
  overallRating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
  comment: string;
  isVerified: boolean;
  ownerReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewPayload {
  bookingId: string;
  overallRating: number;
  cleanlinessRating: number;
  locationRating: number;
  valueRating: number;
  communicationRating: number;
  comment: string;
}

export interface UpdateReviewPayload {
  overallRating?: number;
  cleanlinessRating?: number;
  locationRating?: number;
  valueRating?: number;
  communicationRating?: number;
  comment?: string;
}

/** Map FE Review (rating, replyFromOwner) → mobile UI fields */
const mapReview = (item: any): Review => ({
  id: String(item.id ?? ""),
  homestayId: String(item.homestayId ?? ""),
  homestayName: item.homestayName ?? "",
  homestayImage: item.homestayImage,
  bookingReference: item.bookingReference ?? item.bookingId ?? "",
  overallRating: Number(item.rating ?? item.overallRating ?? 0),
  cleanlinessRating: Number(item.cleanlinessRating ?? 0),
  locationRating: Number(item.locationRating ?? 0),
  valueRating: Number(item.valueRating ?? 0),
  communicationRating: Number(item.communicationRating ?? 0),
  comment: item.comment ?? "",
  isVerified: Boolean(item.isVerified),
  ownerReply: item.replyFromOwner ?? item.ownerReply,
  createdAt: item.createdAt ?? "",
  updatedAt: item.updatedAt ?? item.createdAt ?? "",
});

export const reviewService = {
  /** GET /api/reviews/my-reviews */
  async getMyReviews(): Promise<Review[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.reviews.myReviews);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map(mapReview);
  },

  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.reviews.create,
      {
        bookingId: payload.bookingId,
        rating: payload.overallRating,
        cleanlinessRating: payload.cleanlinessRating,
        locationRating: payload.locationRating,
        valueRating: payload.valueRating,
        communicationRating: payload.communicationRating,
        comment: payload.comment,
      },
    );
    const data = res?.data ?? res;
    return mapReview(data);
  },

  async updateReview(
    reviewId: string,
    payload: UpdateReviewPayload,
  ): Promise<Review> {
    const body: Record<string, unknown> = {};
    if (payload.overallRating !== undefined)
      body.rating = payload.overallRating;
    if (payload.cleanlinessRating !== undefined)
      body.cleanlinessRating = payload.cleanlinessRating;
    if (payload.locationRating !== undefined)
      body.locationRating = payload.locationRating;
    if (payload.valueRating !== undefined) body.valueRating = payload.valueRating;
    if (payload.communicationRating !== undefined)
      body.communicationRating = payload.communicationRating;
    if (payload.comment !== undefined) body.comment = payload.comment;

    const res = await apiClient.put<any>(
      apiConfig.endpoints.reviews.update(reviewId),
      body,
    );
    const data = res?.data ?? res;
    return mapReview(data);
  },

  async deleteReview(
    reviewId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<any>(
      apiConfig.endpoints.reviews.delete(reviewId),
    );
    return {
      success: Boolean(res?.success ?? true),
      message: res?.message ?? "Xóa review thành công",
    };
  },
};
