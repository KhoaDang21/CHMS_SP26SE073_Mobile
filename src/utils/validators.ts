import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được trống")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Mật khẩu không được trống")
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

export const RegisterSchema = z.object({
  fullName: z
    .string()
    .min(1, "Họ tên không được trống")
    .min(2, "Họ tên phải có ít nhất 2 ký tự"),
  email: z
    .string()
    .min(1, "Email không được trống")
    .email("Email không hợp lệ"),
  phone: z
    .string()
    .min(1, "Số điện thoại không được trống")
    .regex(/^\d{10,11}$/, "Số điện thoại không hợp lệ"),
  password: z
    .string()
    .min(1, "Mật khẩu không được trống")
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ cái in thường")
    .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ cái in hoa")
    .regex(/\d/, "Mật khẩu phải có ít nhất 1 số")
    .regex(
      /[!@#$%^&*]/,
      "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)",
    ),
});

export const ProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Tên không được trống")
    .min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z
    .string()
    .min(1, "Số điện thoại không được trống")
    .regex(/^\d{10,11}$/, "Số điện thoại không hợp lệ"),
});

export const BookingSchema = z
  .object({
    checkIn: z.coerce
      .date()
      .min(new Date(), "Ngày nhận phòng phải là ngày hôm nay hoặc sau đó"),
    checkOut: z.coerce.date(),
    guestsCount: z
      .number()
      .min(1, "Số lượng khách phải ít nhất 1")
      .max(10, "Số lượng khách tối đa là 10"),
  })
  .refine(
    (data: { checkIn: Date; checkOut: Date | any }) =>
      data.checkOut > data.checkIn,
    {
      message: "Ngày trả phòng phải sau ngày nhận phòng",
      path: ["checkOut"],
    },
  );

export const ReviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Đánh giá phải từ 1 đến 5 sao")
    .max(5, "Đánh giá phải từ 1 đến 5 sao"),
  comment: z
    .string()
    .min(1, "Nhận xét không được trống")
    .min(10, "Nhận xét phải có ít nhất 10 ký tự")
    .max(500, "Nhận xét không được vượt quá 500 ký tự"),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type ProfileFormData = z.infer<typeof ProfileSchema>;
export type BookingFormData = z.infer<typeof BookingSchema>;
export type ReviewFormData = z.infer<typeof ReviewSchema>;
