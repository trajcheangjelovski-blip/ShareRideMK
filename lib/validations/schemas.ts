import { z } from "zod";

export const registerSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(8),
  is_driver: z.boolean().default(false),
  is_passenger: z.boolean().default(true),
  city_id: z.string().uuid().optional(),
}).refine((d) => d.email || d.phone, {
  message: "Потребен е email или телефон",
});

export const loginSchema = z.object({
  identifier: z.string().min(3), // email or phone
  password: z.string().min(1),
});

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100).optional(),
  color: z.string().optional(),
  license_plate: z.string().min(2),
  seats: z.number().int().min(1).max(8),
  has_ac: z.boolean().default(false),
  luggage_space: z.enum(["none", "small", "medium", "large"]).optional(),
});

export const createTripSchema = z.object({
  vehicle_id: z.string().uuid(),
  start_city_id: z.string().uuid(),
  end_city_id: z.string().uuid(),
  start_address: z.string().optional(),
  start_latitude: z.number(),
  start_longitude: z.number(),
  destination_address: z.string().optional(),
  destination_latitude: z.number(),
  destination_longitude: z.number(),
  departure_date: z.string(), // YYYY-MM-DD
  departure_time: z.string(), // HH:MM
  available_seats: z.number().int().min(1).max(8),
  price_per_seat: z.number().min(0),
  route_description: z.string().optional(),
  detour_allowed: z.boolean().default(true),
  max_detour_minutes: z.number().int().min(0).max(120).default(10),
  smoking_allowed: z.boolean().default(false),
  pets_allowed: z.boolean().default(false),
  luggage_allowed: z.boolean().default(true),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurrence: z.enum(["none", "weekdays", "weekends", "weekly", "custom"]).default("none"),
  waypoints: z.array(z.object({
    city_id: z.string().uuid().optional(),
    address: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    order_index: z.number().int(),
    can_pickup: z.boolean().default(true),
    can_dropoff: z.boolean().default(true),
  })).default([]),
});

export const bookingSchema = z.object({
  seats_requested: z.number().int().min(1).max(8),
  pickup_address: z.string().optional(),
  pickup_latitude: z.number(),
  pickup_longitude: z.number(),
  pickup_note: z.string().optional(),
  dropoff_address: z.string().optional(),
  dropoff_latitude: z.number(),
  dropoff_longitude: z.number(),
  dropoff_note: z.string().optional(),
  message: z.string().optional(),
  luggage_info: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
