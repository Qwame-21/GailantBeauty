export const BRAND = {
  name: "Gailant Beauty",
  tagline: "Where Beauty Wears a Crown",
  description: "Gailant Beauty is Abeka's studio for nails, hair, lashes and makeup, polished, professional beauty, in-studio or delivered to your door.",
  about: "Gailant Beauty is a beauty studio in Abeka built around one idea: every client should leave feeling like royalty. From nails and braids to lashes, makeup and beyond, our stylists bring skill and care to every appointment, whether you come to us or we come to you. Beauty, crowned.",
  location: "Abeka Free Pipe Junction, Abeka Road, Accra",
  mapsUrl: "https://maps.google.com/?q=Gailant+Beauty+Abeka+Road+Accra",
  instagramUrl: "https://instagram.com/gailantbeauty",
  instagramHandle: "@gailantbeauty",
  rating: "5.0 (Google Verified Studio)",
  primaryPhone: "0554980760",
  secondaryPhone: "0208228030",
  whatsapp: "233554980760",
  hours: "Mon to Sat 8am to 7pm • Sun 12pm to 7pm",
  homeSurcharge: 100,
  depositPercent: 30,
};

export type Service = { id: string; name: string; category: string; subCategory?: string; price: number; duration: string; description: string; consultation?: boolean; featured?: boolean; imageUrl?: string; imageAlt?: string };
export type Product = { id: string; name: string; category: string; subCategory?: string; price: number; description: string; badge?: string; tone: string; imageUrl?: string; imageAlt?: string; inventory?: number; sizeLabel?: string; benefits?: string[]; howToUse?: string };

export const CATEGORIES_DROPDOWN = [
  {
    title: "Hair Collection",
    category: "Hair",
    target: "services" as const,
    items: [
      { label: "Long Hair Styles (Braids & Waves)", filter: "Long Hair", target: "services" as const },
      { label: "Short Hair Styles (Bob Units & Cut)", filter: "Short Hair", target: "shop" as const },
      { label: "Silk Press & Treatments", filter: "Treatments", target: "services" as const },
      { label: "Wigs & Bundles Catalog", filter: "Wigs", target: "shop" as const }
    ]
  },
  {
    title: "Nail Studio",
    category: "Nails",
    target: "services" as const,
    items: [
      { label: "Signature Gel Sets", filter: "Gel", target: "services" as const },
      { label: "Acrylic & Extensions", filter: "Acrylic", target: "services" as const },
      { label: "Nail Care & Oils", filter: "Accessories", target: "shop" as const }
    ]
  },
  {
    title: "Lashes & Glam",
    category: "Lashes",
    target: "services" as const,
    items: [
      { label: "Classic & Volume Lash Sets", filter: "Lashes", target: "services" as const },
      { label: "Soft & Full Glam Makeup", filter: "Makeup", target: "services" as const },
      { label: "Lip Essentials & Glosses", filter: "Beauty", target: "shop" as const }
    ]
  }
];

export const SERVICES: Service[] = [];

export const PRODUCTS: Product[] = [];

export type TrackingStatus = string;

export type OrderItem = {
  id: string;
  name: string;
  productId: string;
  size?: string;
  quantity: number;
  price: number;
  image?: string;
};

export type TrackingRecord = {
  reference: string;
  clientName: string;
  email?: string;
  phone?: string;
  type: "Booking" | "Order";
  item: string;
  status: TrackingStatus;
  date: string;
  adminNote?: string;
  refundNote?: string;
  
  // Track Order specific fields
  orderPlacedDate?: string;
  orderDeliveredDate?: string;
  orderStage?: 0 | 1 | 2 | 3 | 4; // 0: Received, 1: Preparing, 2: Ready for Delivery, 3: Out for Delivery, 4: Delivered
  stageTimestamps?: Array<{ stage: string; timestamp?: string; expected?: string }>;
  itemsList?: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  totalAmount?: number;

  // Track Booking specific fields
  bookingStage?: 0 | 1 | 2 | 3; // 0: Booked, 1: Under Review, 2: Confirmed/Rescheduled, 3: Completed
  appointmentDate?: string;
  appointmentTime?: string;
  rescheduledDate?: string;
  rescheduledTime?: string;
  servicePrice?: number;
  depositPaid?: number;
};

export const FAQS = [
  { question: "How do I book an appointment?", answer: "Choose your desired service, click 'Book' or 'Request', select your preferred date and time, and secure your slot with a 30% deposit via Paystack." },
  { question: "Do you offer home services?", answer: "Yes! Select 'Bring Gailant to me' when booking any service. We bring our full professional studio setup directly to your home or hotel in Accra." },
  { question: "What is your rescheduling policy?", answer: "You can reschedule your appointment up to 24 hours prior to your scheduled time. Deposits remain valid for 1 free reschedule." },
  { question: "How can I track my booking or order?", answer: "Enter the reference from your receipt or confirmation in the Track page to view payment status and schedule updates." }
];

export const TESTIMONIALS: Array<{ quote: string; name: string; service: string; rating: number; verified?: string }> = [];

export const POLICIES = [
  "Appointments require a 30% deposit to confirm your slot.",
  "Reschedule or cancel at least 24 hours before your appointment.",
  "Deposits are non-refundable, but may be transferred once with 24 hours’ notice.",
  "Home service is available within Accra; distance-based charges apply.",
  "Please arrive with hair prepared as stated in your service notes.",
];
