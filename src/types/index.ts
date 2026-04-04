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
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "REJECTED"
  | "CHECKED_IN";

export interface Booking {
  id: string;
  homestayId: string;
  homestayName?: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalPrice?: number;
  depositAmount?: number;
  remainingAmount?: number;
  depositPercentage?: number;
  paymentStatus?: "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID";
  status: BookingStatus;
  contactPhone?: string;
  specialRequests?: string;
  createdAt?: string;
}
