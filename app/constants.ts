export const BRAND = {
  name: "Gailant Beauty",
  tagline: "Where Beauty Wears a Crown",
  description: "Gailant Beauty is Abeka's studio for nails, hair, lashes and makeup, polished, professional beauty, in-studio or delivered to your door.",
  about: "Gailant Beauty is a beauty studio in Abeka built around one idea: every client should leave feeling like royalty. From nails and braids to lashes, makeup and beyond, our stylists bring skill and care to every appointment, whether you come to us or we come to you. Beauty, crowned.",
  location: "Abeka Free Pipe Junction, Accra",
  primaryPhone: "0554980760",
  secondaryPhone: "0208228030",
  whatsapp: "233554980760",
  hours: "Mon to Sat 8am to 7pm • Sun 12pm to 7pm",
  homeSurcharge: 100,
  depositPercent: 30,
};

export type Service = { id: string; name: string; category: string; subCategory?: string; price: number; duration: string; description: string; consultation?: boolean; featured?: boolean };
export type Product = { id: string; name: string; category: string; subCategory?: string; price: number; description: string; badge?: string; tone: string };

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

export const SERVICES: Service[] = [
  { id: "svc-1", name: "Signature Gel Set", category: "Nails", subCategory: "Gel", price: 180, duration: "1 hr 30 min", description: "Detailed prep, shaping and a flawless gel finish.", featured: true },
  { id: "svc-2", name: "Knotless Braids (Long)", category: "Hair", subCategory: "Long Hair", price: 450, duration: "4 to 6 hrs", description: "Lightweight, clean-parted long braids finished with care.", featured: true },
  { id: "svc-3", name: "Soft Glam", category: "Makeup", subCategory: "Makeup", price: 350, duration: "1 hr 15 min", description: "Radiant skin, softly sculpted eyes and an elegant finish.", featured: true },
  { id: "svc-4", name: "Classic Lash Set", category: "Lashes", subCategory: "Lashes", price: 250, duration: "2 hrs", description: "A natural, polished set tailored to your eye shape." },
  { id: "svc-5", name: "Microblading", category: "Brows", subCategory: "Brows", price: 900, duration: "Consultation", description: "Bespoke brow mapping and semi-permanent definition.", consultation: true },
  { id: "svc-6", name: "Locs Consultation", category: "Locs", subCategory: "Locs", price: 0, duration: "Consultation", description: "Start or maintain your loc journey with a tailored plan.", consultation: true },
  { id: "svc-7", name: "Beauty Training", category: "Training", subCategory: "Training", price: 0, duration: "Consultation", description: "Hands-on professional beauty training for every level.", consultation: true },
  { id: "svc-8", name: "Silk Press & Treatment", category: "Hair", subCategory: "Treatments", price: 300, duration: "2 hrs", description: "Smooth, bouncy movement with heat-protective care." },
];

export const PRODUCTS: Product[] = [
  { id: "prd-1", name: "The Accra Bob (Short Hair)", category: "Wigs", subCategory: "Short Hair", price: 950, description: "10-inch precision bob, pre-plucked and ready to wear.", badge: "Bestseller", tone: "espresso" },
  { id: "prd-2", name: "Royal Wave Unit (Long Hair)", category: "Wigs", subCategory: "Long Hair", price: 1450, description: "22-inch body wave unit with a natural lace finish.", badge: "New", tone: "linen" },
  { id: "prd-3", name: "Crown Melt Band", category: "Accessories", subCategory: "Accessories", price: 60, description: "Soft, secure melt band for seamless lace installs.", tone: "onyx" },
  { id: "prd-4", name: "Gloss & Go Duo", category: "Beauty", subCategory: "Beauty", price: 120, description: "Two high-shine lip essentials for effortless polish.", tone: "blush" },
];

export type TrackingStatus = string;

export type TrackingRecord = {
  reference: string;
  clientName: string;
  type: "Booking" | "Order";
  item: string;
  status: TrackingStatus;
  date: string;
  adminNote?: string;
  refundNote?: string;
};

export const MOCK_TRACKING_DATABASE: Record<string, TrackingRecord> = {
  "GB-2026-001": {
    reference: "GB-2026-001",
    clientName: "Abena Mansa",
    type: "Booking",
    item: "Knotless Braids (Long)",
    status: "Paid",
    date: "July 24, 2026 at 10:00 AM",
    adminNote: "30% Deposit confirmed via Paystack. See you at Abeka studio!"
  },
  "GB-2026-002": {
    reference: "GB-2026-002",
    clientName: "Kofi Owusu",
    type: "Order",
    item: "The Accra Bob (Short Hair)",
    status: "Guaranteed",
    date: "July 23, 2026",
    adminNote: "Order packaged and guaranteed for home dispatch."
  },
  "GB-2026-003": {
    reference: "GB-2026-003",
    clientName: "Efya Mensah",
    type: "Booking",
    item: "Signature Gel Set",
    status: "Rescheduled",
    date: "July 26, 2026 at 2:00 PM (Originally July 22)",
    adminNote: "Rescheduled upon client request. Stylist slot updated to Sunday 2:00 PM."
  },
  "GB-2026-004": {
    reference: "GB-2026-004",
    clientName: "Akosua Addo",
    type: "Booking",
    item: "Soft Glam",
    status: "Canceled",
    date: "July 22, 2026",
    adminNote: "Appointment canceled due to schedule conflict.",
    refundNote: "ATTENTION ADMIN: 100% Refund (GH₵ 105.00) issued back to MoMo / Bank account."
  }
};

export const FAQS = [
  { question: "How do I book an appointment?", answer: "Choose your desired service, click 'Book' or 'Request', select your preferred date and time, and secure your slot with a 30% deposit via Paystack." },
  { question: "Do you offer home services?", answer: "Yes! Select 'Bring Gailant to me' when booking any service. We bring our full professional studio setup directly to your home or hotel in Accra." },
  { question: "What is your rescheduling policy?", answer: "You can reschedule your appointment up to 24 hours prior to your scheduled time. Deposits remain valid for 1 free reschedule." },
  { question: "How can I track my booking or order?", answer: "Enter your reference code (e.g. GB-2026-001) in the Track page to view your payment status, schedule updates, or cancellation details in real-time." }
];

export const TESTIMONIALS = [
  { quote: "From the welcome to the final look, everything felt considered. My nails were immaculate and lasted beautifully.", name: "Ama K.", service: "Signature Gel Set", rating: 5 },
  { quote: "The home service was punctual, professional and so convenient. I felt completely taken care of.", name: "Nana A.", service: "Soft Glam", rating: 5 },
  { quote: "My braids are neat, light and exactly what I showed them. Gailant is now my beauty home.", name: "Esi M.", service: "Knotless Braids", rating: 5 },
  { quote: "Ordered the Accra Bob unit online and received it the same afternoon. Top notch luxury packaging!", name: "Yaa B.", service: "The Accra Bob", rating: 5 }
];

export const POLICIES = [
  "Appointments require a 30% deposit to confirm your slot.",
  "Reschedule or cancel at least 24 hours before your appointment.",
  "Deposits are non-refundable, but may be transferred once with 24 hours’ notice.",
  "Home service is available within Accra; distance-based charges apply.",
  "Please arrive with hair prepared as stated in your service notes.",
];
