export const BRAND = {
  name: "Gailand Beauty",
  tagline: "Where Beauty Wears a Crown",
  description: "Gailand Beauty is Abeka's studio for nails, hair, lashes and makeup — polished, professional beauty, in-studio or delivered to your door.",
  about: "Gailand Beauty is a beauty studio in Abeka built around one idea: every client should leave feeling like royalty. From nails and braids to lashes, makeup and beyond, our stylists bring skill and care to every appointment — whether you come to us or we come to you. Beauty, crowned.",
  location: "Abeka Free Pipe Junction, Accra",
  primaryPhone: "0554980760",
  secondaryPhone: "0208228030",
  whatsapp: "233554980760",
  hours: "Mon–Sat 8am–7pm · Sun 12pm–7pm",
  homeSurcharge: 100,
  depositPercent: 30,
};

export type Service = { id: string; name: string; category: string; price: number; duration: string; description: string; consultation?: boolean; featured?: boolean };
export type Product = { id: string; name: string; category: string; price: number; description: string; badge?: string; tone: string };

export const SERVICES: Service[] = [
  { id: "svc-1", name: "Signature Gel Set", category: "Nails", price: 180, duration: "1 hr 30 min", description: "Detailed prep, shaping and a flawless gel finish.", featured: true },
  { id: "svc-2", name: "Knotless Braids", category: "Hair", price: 450, duration: "4–6 hrs", description: "Lightweight, clean-parted braids finished with care.", featured: true },
  { id: "svc-3", name: "Soft Glam", category: "Makeup", price: 350, duration: "1 hr 15 min", description: "Radiant skin, softly sculpted eyes and an elegant finish.", featured: true },
  { id: "svc-4", name: "Classic Lash Set", category: "Lashes", price: 250, duration: "2 hrs", description: "A natural, polished set tailored to your eye shape." },
  { id: "svc-5", name: "Microblading", category: "Brows", price: 900, duration: "Consultation", description: "Bespoke brow mapping and semi-permanent definition.", consultation: true },
  { id: "svc-6", name: "Locs Consultation", category: "Locs", price: 0, duration: "Consultation", description: "Start or maintain your loc journey with a tailored plan.", consultation: true },
  { id: "svc-7", name: "Beauty Training", category: "Training", price: 0, duration: "Consultation", description: "Hands-on professional beauty training for every level.", consultation: true },
  { id: "svc-8", name: "Silk Press", category: "Hair", price: 300, duration: "2 hrs", description: "Smooth, bouncy movement with heat-protective care." },
];

export const PRODUCTS: Product[] = [
  { id: "prd-1", name: "The Accra Bob", category: "Wigs", price: 950, description: "10-inch precision bob, pre-plucked and ready to wear.", badge: "Bestseller", tone: "espresso" },
  { id: "prd-2", name: "Royal Wave Unit", category: "Wigs", price: 1450, description: "22-inch body wave unit with a natural lace finish.", badge: "New", tone: "linen" },
  { id: "prd-3", name: "Crown Melt Band", category: "Accessories", price: 60, description: "Soft, secure melt band for seamless lace installs.", tone: "onyx" },
  { id: "prd-4", name: "Gloss & Go Duo", category: "Beauty", price: 120, description: "Two high-shine lip essentials for effortless polish.", tone: "blush" },
];

export const TESTIMONIALS = [
  { quote: "From the welcome to the final look, everything felt considered. My nails were immaculate and lasted beautifully.", name: "Ama K.", service: "Signature Gel Set" },
  { quote: "The home service was punctual, professional and so convenient. I felt completely taken care of.", name: "Nana A.", service: "Soft Glam" },
  { quote: "My braids are neat, light and exactly what I showed them. Gailand is now my beauty home.", name: "Esi M.", service: "Knotless Braids" },
];

export const POLICIES = [
  "Appointments require a 30% deposit to confirm your slot.",
  "Reschedule or cancel at least 24 hours before your appointment.",
  "Deposits are non-refundable, but may be transferred once with 24 hours’ notice.",
  "Home service is available within Accra; distance-based charges may apply.",
  "Please arrive with hair prepared as stated in your service notes.",
];
