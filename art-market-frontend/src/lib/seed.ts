import { Admin, Artwork, CopyrightTransfer, Order, Payment, User } from "@/types";
import { artworkPlaceholder, avatarPlaceholder } from "./placeholder";

export const SEED_ADMIN: Admin[] = [
  { id: "admin_1", username: "admin", password: "admin1234" },
];

export const SEED_USERS: User[] = [
  {
    id: "user_seller1",
    username: "nichaart",
    password: "password1",
    email: "nicha.art@gmail.com",
    fullName: "Nicha Suwan",
    phoneNumber: "0812345678",
    nationalNo: "1100200330045",
    profileImage: avatarPlaceholder("user_seller1", "Nicha Suwan"),
    address: {
      id: "addr_1",
      houseNo: "12/3",
      villageNo: "4",
      thoroughfare: "Suthep Rd.",
      subDistrict: "Suthep",
      district: "Mueang",
      province: "Chiang Mai",
      postalCode: "50200",
    },
    roles: ["buyer", "seller"],
    sellerStatus: "approved",
    createdAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "user_seller2",
    username: "kritstudio",
    password: "password1",
    email: "krit.studio@gmail.com",
    fullName: "Krit Boonme",
    phoneNumber: "0898765432",
    nationalNo: "1100200330099",
    profileImage: avatarPlaceholder("user_seller2", "Krit Boonme"),
    address: {
      id: "addr_2",
      houseNo: "88",
      villageNo: "1",
      thoroughfare: "Nimman Rd.",
      subDistrict: "Suthep",
      district: "Mueang",
      province: "Chiang Mai",
      postalCode: "50200",
    },
    roles: ["buyer", "seller"],
    sellerStatus: "approved",
    createdAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "user_seller3",
    username: "pending_artist",
    password: "password1",
    email: "pending.artist@gmail.com",
    fullName: "Ploy Sirikan",
    phoneNumber: "0865554443",
    nationalNo: "1100200330111",
    profileImage: avatarPlaceholder("user_seller3", "Ploy Sirikan"),
    address: {
      id: "addr_3",
      houseNo: "9",
      villageNo: "2",
      thoroughfare: "Huay Kaew Rd.",
      subDistrict: "Chang Phueak",
      district: "Mueang",
      province: "Chiang Mai",
      postalCode: "50300",
    },
    roles: ["buyer", "seller"],
    sellerStatus: "pending",
    createdAt: "2026-03-01T09:00:00.000Z",
  },
  {
    id: "user_buyer1",
    username: "punchapong",
    password: "password1",
    email: "punchapong@gmail.com",
    fullName: "Punchapong Rung",
    phoneNumber: "0891112222",
    profileImage: avatarPlaceholder("user_buyer1", "Punchapong Rung"),
    roles: ["buyer"],
    sellerStatus: "none",
    createdAt: "2026-02-01T09:00:00.000Z",
  },
];

function art(
  id: string,
  sellerId: string,
  sellerName: string,
  artworkName: string,
  artworkType: string,
  artworkStyle: string,
  artworkMediums: string,
  price: number,
  copyrightAvailable = true
): Artwork {
  return {
    id,
    sellerId,
    sellerName,
    artworkName,
    artworkImage: artworkPlaceholder(id, artworkName),
    artworkType,
    artworkStyle,
    artworkMediums,
    artworkMaterial: "Canvas",
    artworkSize: "60x80 cm",
    description: `ผลงาน "${artworkName}" สร้างสรรค์ด้วยเทคนิค ${artworkMediums} สไตล ${artworkStyle} โดยศิลปิน ${sellerName}`,
    price,
    publishDate: "2026-04-01T00:00:00.000Z",
    artworkStatus: "published",
    copyrightAvailable,
    copyrightPrice: copyrightAvailable ? Math.round(price * 1.5) : undefined,
  };
}

export const SEED_ARTWORKS: Artwork[] = [
  art("art_1", "user_seller1", "Nicha Suwan", "Whispering Dawn", "Painting", "Impressionism", "Oil on canvas", 8500),
  art("art_2", "user_seller1", "Nicha Suwan", "Northern Mist", "Painting", "Realism", "Watercolor", 6200),
  art("art_3", "user_seller1", "Nicha Suwan", "Golden Field", "Painting", "Abstract", "Acrylic", 12000, false),
  art("art_4", "user_seller2", "Krit Boonme", "Urban Pulse", "Digital Art", "Contemporary", "Digital Painting", 4500),
  art("art_5", "user_seller2", "Krit Boonme", "Silent Harbor", "Photography", "Fine Art", "Photography", 3200),
  art("art_6", "user_seller2", "Krit Boonme", "Echoes of Lanna", "Sculpture", "Traditional", "Bronze", 25000, false),
  art("art_7", "user_seller1", "Nicha Suwan", "Petals & Ink", "Painting", "Minimalism", "Ink Wash", 5400),
  art("art_8", "user_seller2", "Krit Boonme", "Neon Temple", "Digital Art", "Cyberpunk", "Digital Painting", 7800),
];

export const SEED_ORDERS: Order[] = [
  {
    id: "order_1",
    buyerId: "user_buyer1",
    buyerName: "Punchapong Rung",
    sellerId: "user_seller1",
    sellerName: "Nicha Suwan",
    items: [
      {
        id: "oi_1",
        artworkId: "art_2",
        artworkName: "Northern Mist",
        artworkImage: SEED_ARTWORKS[1]?.artworkImage ?? "",
        price: 6200,
      },
    ],
    totalAmount: 6200,
    shippingCost: 150,
    grandTotal: 6350,
    orderStatus: "awaiting_payment",
    availabilityStatus: "confirmed",
    shippingStatus: "not_shipped",
    paymentStatus: "unpaid",
    orderDate: "2026-08-01T03:00:00.000Z",
    confirmDateTime: "2026-08-01T03:00:00.000Z",
  },
];

export const SEED_PAYMENTS: Payment[] = [];

export const SEED_COPYRIGHT_TRANSFERS: CopyrightTransfer[] = [];
