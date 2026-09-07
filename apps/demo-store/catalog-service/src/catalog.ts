export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  emoji: string;
  rating: number;
  review_count: number;
  description: string;
}

export const CATEGORIES = [
  { slug: 'computers', name: 'Computers', emoji: '💻' },
  { slug: 'audio', name: 'Audio', emoji: '🎧' },
  { slug: 'displays', name: 'Displays', emoji: '🖥️' },
  { slug: 'peripherals', name: 'Peripherals', emoji: '⌨️' },
  { slug: 'home-office', name: 'Home Office', emoji: '🪑' },
  { slug: 'storage', name: 'Storage & Power', emoji: '🔌' }
];

/**
 * The storefront catalogue. Kept in code so the service can seed a fresh database and
 * still serve a sensible catalogue when Postgres is unavailable.
 */
export const CATALOG: CatalogProduct[] = [
  { id: 'item-1', name: 'Wireless Precision Mouse', price: 29.99, stock: 100, category: 'peripherals', brand: 'Lyra', emoji: '🖱️', rating: 4.4, review_count: 2419, description: 'Silent switches, 4000 DPI sensor and a claimed 70-day battery on a single charge.' },
  { id: 'item-2', name: 'Mechanical Keyboard MK-87', price: 89.99, stock: 50, category: 'peripherals', brand: 'Lyra', emoji: '⌨️', rating: 4.7, review_count: 8912, description: 'Hot-swappable linear switches, PBT double-shot caps and a South-facing RGB matrix.' },
  { id: 'item-3', name: 'USB-C Hub 10-in-1', price: 49.99, stock: 75, category: 'storage', brand: 'Nodus', emoji: '🔌', rating: 4.2, review_count: 1204, description: 'Dual 4K HDMI, gigabit ethernet, SD/microSD and 100W pass-through charging.' },
  { id: 'item-4', name: 'Adjustable Monitor Stand', price: 39.99, stock: 60, category: 'home-office', brand: 'Fernweh', emoji: '🪞', rating: 4.1, review_count: 640, description: 'Solid beech riser with a cable channel and a drawer for the things on your desk.' },
  { id: 'item-5', name: 'Webcam Studio HD', price: 59.99, stock: 40, category: 'peripherals', brand: 'Corvid', emoji: '📷', rating: 3.9, review_count: 512, description: '1080p60 with a physical privacy shutter and dual noise-cancelling microphones.' },

  { id: 'item-6', name: '27-inch 4K IPS Monitor', price: 349.0, stock: 32, category: 'displays', brand: 'Corvid', emoji: '🖥️', rating: 4.6, review_count: 3110, description: 'Factory-calibrated 99% sRGB panel with a single-cable USB-C dock built in.' },
  { id: 'item-7', name: '34-inch Ultrawide Curved', price: 629.0, stock: 14, category: 'displays', brand: 'Corvid', emoji: '🖥️', rating: 4.5, review_count: 1877, description: '3440x1440 at 144Hz. Wide enough that you stop needing a second monitor.' },
  { id: 'item-8', name: 'Portable 15" Touch Display', price: 219.0, stock: 26, category: 'displays', brand: 'Nodus', emoji: '📱', rating: 4.0, review_count: 431, description: 'Runs off one USB-C cable and folds into its own magnetic cover.' },

  { id: 'item-9', name: 'Studio Over-Ear Headphones', price: 199.0, stock: 55, category: 'audio', brand: 'Aurel', emoji: '🎧', rating: 4.8, review_count: 12043, description: 'Closed-back reference cans with a replaceable cable and memory-foam pads.' },
  { id: 'item-10', name: 'ANC Wireless Earbuds', price: 129.0, stock: 88, category: 'audio', brand: 'Aurel', emoji: '🎵', rating: 4.3, review_count: 6702, description: 'Adaptive noise cancelling, multipoint pairing and 28 hours with the case.' },
  { id: 'item-11', name: 'Desktop USB Microphone', price: 109.0, stock: 41, category: 'audio', brand: 'Aurel', emoji: '🎙️', rating: 4.5, review_count: 2288, description: 'Cardioid condenser with a zero-latency headphone monitor and a mute you can feel.' },
  { id: 'item-12', name: 'Bookshelf Speaker Pair', price: 279.0, stock: 19, category: 'audio', brand: 'Aurel', emoji: '🔊', rating: 4.6, review_count: 903, description: 'Two-way powered monitors with optical, USB and balanced TRS inputs.' },

  { id: 'item-13', name: 'ArrayBook Pro 14', price: 1499.0, stock: 12, category: 'computers', brand: 'Array', emoji: '💻', rating: 4.7, review_count: 5421, description: '14-inch workstation laptop, 32GB unified memory, 1TB NVMe, 18-hour battery.' },
  { id: 'item-14', name: 'ArrayBook Air 13', price: 999.0, stock: 24, category: 'computers', brand: 'Array', emoji: '💻', rating: 4.6, review_count: 7815, description: 'Fanless, 1.2kg, and quiet enough that you forget it is running.' },
  { id: 'item-15', name: 'Mini Desktop Workstation', price: 849.0, stock: 17, category: 'computers', brand: 'Array', emoji: '🖥️', rating: 4.4, review_count: 1122, description: 'A litre of aluminium holding 8 cores, 64GB of RAM and four display outputs.' },
  { id: 'item-16', name: 'Developer Tablet 11', price: 649.0, stock: 30, category: 'computers', brand: 'Array', emoji: '📱', rating: 4.2, review_count: 2044, description: 'Pressure-sensitive stylus, detachable keyboard and a genuinely usable terminal.' },

  { id: 'item-17', name: 'Ergonomic Task Chair', price: 459.0, stock: 21, category: 'home-office', brand: 'Fernweh', emoji: '🪑', rating: 4.5, review_count: 3390, description: 'Mesh back, four-dimensional arms and a forward tilt for when you are concentrating.' },
  { id: 'item-18', name: 'Standing Desk 160cm', price: 699.0, stock: 9, category: 'home-office', brand: 'Fernweh', emoji: '🪵', rating: 4.6, review_count: 1841, description: 'Dual-motor frame, four memory presets and a solid oak top.' },
  { id: 'item-19', name: 'Desk Lamp with CRI 97', price: 89.0, stock: 64, category: 'home-office', brand: 'Fernweh', emoji: '💡', rating: 4.3, review_count: 722, description: 'Tuneable 2700-6500K light that renders colour the way daylight does.' },
  { id: 'item-20', name: 'Acoustic Desk Divider', price: 149.0, stock: 33, category: 'home-office', brand: 'Fernweh', emoji: '🧱', rating: 3.8, review_count: 214, description: 'Felt panel that takes the edge off an open-plan office. Mounts with two clamps.' },

  { id: 'item-21', name: '2TB NVMe SSD Gen4', price: 179.0, stock: 70, category: 'storage', brand: 'Nodus', emoji: '💾', rating: 4.7, review_count: 4501, description: '7,400 MB/s sequential reads with a five-year warranty and a heatsink in the box.' },
  { id: 'item-22', name: 'Portable SSD 1TB', price: 119.0, stock: 82, category: 'storage', brand: 'Nodus', emoji: '🗄️', rating: 4.5, review_count: 3277, description: 'Pocket-sized, IP55 rated, and fast enough to edit straight off the drive.' },
  { id: 'item-23', name: '100W GaN Charger', price: 69.0, stock: 95, category: 'storage', brand: 'Nodus', emoji: '⚡', rating: 4.6, review_count: 2910, description: 'Three USB-C ports and one USB-A in something the size of a matchbox.' },
  { id: 'item-24', name: '20,000mAh Power Bank', price: 79.0, stock: 58, category: 'storage', brand: 'Nodus', emoji: '🔋', rating: 4.4, review_count: 1633, description: 'Charges a laptop once or a phone four times. Passes through while charging.' },

  { id: 'item-25', name: 'Ultrawide Mouse Pad', price: 34.99, stock: 120, category: 'peripherals', brand: 'Lyra', emoji: '🟫', rating: 4.4, review_count: 1188, description: '900x400mm stitched-edge cloth mat with a grippy natural rubber base.' },
  { id: 'item-26', name: 'Vertical Ergonomic Mouse', price: 54.99, stock: 47, category: 'peripherals', brand: 'Lyra', emoji: '🖱️', rating: 4.1, review_count: 856, description: 'A 57-degree grip that puts your forearm where it wants to be.' },
  { id: 'item-27', name: 'Stream Control Deck', price: 149.0, stock: 23, category: 'peripherals', brand: 'Corvid', emoji: '🎛️', rating: 4.5, review_count: 1975, description: 'Fifteen tactile LCD keys you can map to anything that has a shortcut.' },
  { id: 'item-28', name: 'Wireless Charging Mat', price: 44.99, stock: 91, category: 'storage', brand: 'Nodus', emoji: '🔆', rating: 3.9, review_count: 604, description: 'Charges three devices at once and stays cool enough to leave on a bedside table.' }
];

export function findProduct(id: string): CatalogProduct | undefined {
  return CATALOG.find((p) => p.id === id);
}
