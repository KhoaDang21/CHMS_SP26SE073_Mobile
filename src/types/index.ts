export type UserRole = "customer" | "manager" | "staff" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Homestay {
  id: string;
  name: string;
  description: string;
  address: string;
  districtName?: string;
  provinceName?: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  images: string[];
  amenities: string[];
  ownerName?: string;
  depositPercentage?: number;
  averageRating?: number;
  reviewCount?: number;
  facilities?: string[];
  rules?: string[];
}

export interface Promotion {
  id: string;
  code?: string;
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number;
  minBookingPrice?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  usageLimit?: number;
  usedCount?: number;
}

export interface Coupon {
  id: string;
  code: string;
  promotion: Promotion;
  discountAmount?: number;
  originalPrice?: number;
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "REJECTED"
  | "CHECKED_IN";

export interface Experience {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  categoryId?: string;
  homestayId?: string;
  image?: string;
  isActive?: boolean;
}

export interface ExtraCharge {
  id: string;
  description: string;
  amount: number;
  chargeType?: string;
  appliedDate?: string;
}

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalPrice?: number;
  basePrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number;
  paymentStatus?: "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID";
  status: BookingStatus;
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  experienceData?: string; // JSON string containing selected experiences
  experiences?: Experience[];
  extraCharges?: ExtraCharge[];
  couponCode?: string;
  promotionId?: string;
  discountAmount?: number;
  createdAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationRefundAmount?: number;
}
