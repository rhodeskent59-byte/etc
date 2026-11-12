/**
 * Gemini Supply - 8-Piece Capsule Catalog & Bespoke Per-Product Choreography Data
 * Zero external brand names, zero em-dashes, calm editorial specs.
 */

export function webPhoto(stem) {
  return `./assets/photos/web/${stem}.webp`;
}

export function hiResPhoto(stem) {
  return `./assets/photos/web/${stem}.webp`;
}

export const PRODUCTS = [
  {
    id: '01',
    category: 'Apparel',
    title: 'Nano Banana Sweatshirt',
    priceCents: 7700,
    priceFormatted: 'GBP £77.00',
    sizes: ['S', 'M', 'L', 'XL'],
    defaultSize: 'L',
    spec: 'Heavyweight Cotton Fleece. Butter Cream. Raised Chest & Back-Collar Embroidery.',
    specGrid: [
      { key: 'FABRIC', value: '460 GSM Heavyweight Fleece' },
      { key: 'TONE', value: 'Butter Cream' },
      { key: 'FRONT', value: 'Raised Gemini Embroidery' },
      { key: 'REAR', value: 'Back-Collar Banana Stitch' },
    ],
    outboundUrl: 'https://your.merch.google/nano-banana-sweatshirt.html',
    cardPrimaryShot: '01_b_sweatshirt_medium',
    cardHoverShot: '01_d_sweatshirt_back_collar',
    stageShots: [
      { stem: '01_b_sweatshirt_medium', label: 'Three-Quarter', aspect: 3712 / 4608 },
      { stem: '01_c_sweatshirt_front_macro', label: 'Chest Embroidery', aspect: 3712 / 4608 },
      { stem: '01_d_sweatshirt_back_collar', label: 'Collar Detail', aspect: 3712 / 4608 },
      { stem: '01_a_sweatshirt_wide', label: 'Full Silhouette', aspect: 3584 / 4800 },
    ],
  },
  {
    id: '02',
    category: 'Apparel',
    title: 'Nano Banana T-Shirt',
    priceCents: 4300,
    priceFormatted: 'GBP £43.00',
    sizes: ['S', 'M', 'L', 'XL'],
    defaultSize: 'L',
    spec: 'Midweight Combed Cotton Jersey. Soft Yellow. Front Wordmark & Back-Collar Print.',
    specGrid: [
      { key: 'FABRIC', value: 'Combed Cotton Jersey' },
      { key: 'TONE', value: 'Soft Yellow' },
      { key: 'FRONT', value: 'Gemini Wordmark Print' },
      { key: 'REAR', value: 'Back-Collar Banana Print' },
    ],
    outboundUrl: 'https://your.merch.google/nano-banana-tee.html',
    cardPrimaryShot: '02_a_banana_tee_candid',
    cardHoverShot: '02_d_banana_tee_back_collar',
    stageShots: [
      { stem: '02_a_banana_tee_candid', label: 'Front Fit', aspect: 3712 / 4608 },
      { stem: '02_c_banana_tee_chest_flash', label: 'Chest Print', aspect: 3712 / 4608 },
      { stem: '02_d_banana_tee_back_collar', label: 'Collar Print', aspect: 3712 / 4608 },
      { stem: '02_b_banana_tee_walk', label: 'Street Stride', aspect: 3584 / 4800 },
    ],
  },
  {
    id: '03',
    category: 'Objects',
    title: 'Nano Banana Tote Bag',
    priceCents: 2400,
    priceFormatted: 'GBP £24.00',
    sizes: ['ONE SIZE'],
    defaultSize: 'ONE SIZE',
    spec: 'Heavy Unbleached Cotton Canvas. Dual-Sided Print: Wordmark & Peeled Banana.',
    specGrid: [
      { key: 'MATERIAL', value: 'Heavy Unbleached Canvas' },
      { key: 'FRONT', value: 'Gemini Wordmark' },
      { key: 'REVERSE', value: 'Peeled Nano Banana' },
      { key: 'CARRY', value: 'Reinforced Webbing Straps' },
    ],
    outboundUrl: 'https://your.merch.google/nano-banana-tote-bag.html',
    cardPrimaryShot: '03_b_tote_side_a_carry',
    cardHoverShot: '03_c_tote_side_b_closeup',
    stageShots: [
      { stem: '03_b_tote_side_a_carry', label: 'Front Carry', aspect: 3712 / 4608 },
      { stem: '03_c_tote_side_b_closeup', label: 'Reverse Print', aspect: 3712 / 4608 },
      { stem: '03_d_tote_curb_still', label: 'Curb Study', aspect: 825 / 1024 },
      { stem: '03_a_tote_overhead_walk', label: 'Overhead Walk', aspect: 3584 / 4800 },
    ],
  },
  {
    id: '04',
    category: 'Apparel',
    title: 'Nano Banana Sports Socks',
    priceCents: 2100,
    priceFormatted: 'GBP £21.00',
    sizes: ['S/M', 'L/XL'],
    defaultSize: 'L/XL',
    spec: 'Ribbed Athletic Crew Knit. Optic White. Outer-Ankle Banana Embroidery.',
    specGrid: [
      { key: 'KNIT', value: 'Ribbed Athletic Crew' },
      { key: 'TONE', value: 'Optic White' },
      { key: 'DETAIL', value: 'Outer-Ankle Embroidery' },
      { key: 'FOOTBED', value: 'Cushioned Terry Sole' },
    ],
    outboundUrl: 'https://your.merch.google/nano-banana-sports-socks.html',
    cardPrimaryShot: '04_a_socks_overhead_trio',
    cardHoverShot: '04_b_socks_pavement_stride',
    stageShots: [
      { stem: '04_a_socks_overhead_trio', label: 'Overhead Trio', aspect: 3712 / 4608 },
      { stem: '04_b_socks_pavement_stride', label: 'Pavement Stride', aspect: 3584 / 4800 },
      { stem: '04_c_socks_ankle_macro', label: 'Ankle Embroidery', aspect: 3712 / 4608 },
    ],
  },
  {
    id: '05',
    category: 'Objects',
    title: 'Nano Banana Pin Badge',
    priceCents: 700,
    priceFormatted: 'GBP £7.00',
    sizes: ['ONE SIZE'],
    defaultSize: 'ONE SIZE',
    spec: 'Die-Struck Hard Enamel & Polished Metal Bevel. Butterfly Clutch.',
    specGrid: [
      { key: 'BODY', value: 'Die-Struck Hard Enamel' },
      { key: 'FINISH', value: 'Polished Metal Bevel' },
      { key: 'FASTENER', value: 'Rear Butterfly Clutch' },
      { key: 'MOTIF', value: 'Peeled Nano Banana' },
    ],
    outboundUrl: 'https://your.merch.google/nano-banana-pin-badge.html',
    cardPrimaryShot: '05_a_pin_collar_flash',
    cardHoverShot: '05_c_pin_enamel_macro',
    stageShots: [
      { stem: '05_a_pin_collar_flash', label: 'Lapel Placement', aspect: 4096 / 4096 },
      { stem: '05_b_pin_night_portrait', label: 'Night Flash', aspect: 3712 / 4608 },
      { stem: '05_c_pin_enamel_macro', label: 'Enamel Bevel', aspect: 3712 / 4608 },
    ],
  },
  {
    id: '06',
    category: 'Apparel',
    title: 'Gemini Black T-Shirt',
    priceCents: 3000,
    priceFormatted: 'GBP £30.00',
    sizes: ['S', 'M', 'L', 'XL'],
    defaultSize: 'L',
    spec: 'Relaxed Heavyweight Cotton Jersey. Jet Black. Left-Chest Spark Lockup.',
    specGrid: [
      { key: 'FABRIC', value: 'Heavyweight Cotton Jersey' },
      { key: 'TONE', value: 'Jet Black' },
      { key: 'LOCKUP', value: 'Left-Chest Spark & Type' },
      { key: 'COLLAR', value: 'Set-In Ribbed Crewneck' },
    ],
    outboundUrl: 'https://your.merch.google/gemini-black-t-shirt-3.html',
    cardPrimaryShot: '06_a_black_tee_shutter',
    cardHoverShot: '06_b_black_tee_crouch',
    stageShots: [
      { stem: '06_d_black_tee_full', label: 'Full Drape', aspect: 3712 / 4608 },
      { stem: '06_a_black_tee_shutter', label: 'Shutter Study', aspect: 3584 / 4800 },
      { stem: '06_b_black_tee_crouch', label: 'Low Angle', aspect: 3584 / 4800 },
      { stem: '06_c_black_tee_chest_macro', label: 'Spark Lockup', aspect: 3712 / 4608 },
    ],
  },
  {
    id: '07',
    category: 'Objects',
    title: 'Gemini Insulated Bottle',
    priceCents: 1800,
    priceFormatted: 'GBP £18.00',
    sizes: ['500 ML'],
    defaultSize: '500 ML',
    spec: 'Double-Wall Vacuum Stainless Steel. Matte Black Powder Coat.',
    specGrid: [
      { key: 'BODY', value: 'Double-Wall Stainless Steel' },
      { key: 'COATING', value: 'Matte Black Powder Coat' },
      { key: 'CAPACITY', value: '500 ML' },
      { key: 'SEAL', value: 'Threaded Leakproof Cap' },
    ],
    outboundUrl: 'https://your.merch.google/gemini-insualted-bottle-black.html',
    cardPrimaryShot: '07_c_bottle_basalt_macro',
    cardHoverShot: '07_b_bottle_hand_reach',
    stageShots: [
      { stem: '07_c_bottle_basalt_macro', label: 'Powder Coat', aspect: 3712 / 4608 },
      { stem: '07_b_bottle_hand_reach', label: 'Hand Grip', aspect: 3584 / 4800 },
      { stem: '07_a_bottle_pan_blur', label: 'Motion Pan', aspect: 3712 / 4608 },
    ],
  },
  {
    id: '08',
    category: 'Objects',
    title: 'Gemini Holographic Sticker Pack',
    priceCents: 916,
    priceFormatted: 'GBP £9.16',
    sizes: ['16 STICKERS'],
    defaultSize: '16 STICKERS',
    spec: 'Iridescent Prism Foil Vinyl. Kiss-Cut Sheet Across Three Scales.',
    specGrid: [
      { key: 'SUBSTRATE', value: 'Iridescent Prism Foil Vinyl' },
      { key: 'CUT', value: 'Precision Kiss-Cut Sheet' },
      { key: 'COUNT', value: '16 Die-Cut Marks' },
      { key: 'ADHESIVE', value: 'Weatherproof Removable' },
    ],
    outboundUrl: 'https://your.merch.google/gemini-holographic-sticker-pack.html',
    cardPrimaryShot: '08_a_stickers_concrete_sheet',
    cardHoverShot: '08_b_stickers_laptop_metal',
    stageShots: [
      { stem: '08_a_stickers_concrete_sheet', label: 'Full Foil Sheet', aspect: 3712 / 4608 },
      { stem: '08_b_stickers_laptop_metal', label: 'Anodized Metal', aspect: 3712 / 4608 },
      { stem: '08_c_stickers_polycarbonate_peel', label: 'Foil Peel', aspect: 3712 / 4608 },
      { stem: '08_d_stickers_steel_street', label: 'Brushed Steel', aspect: 3712 / 4608 },
    ],
  },
];

export const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// Row 1 = 4 Apparel pieces, Row 2 = 4 Objects (matching narrative order)
export const CATALOG_DISPLAY_ORDER = ['02', '01', '06', '04', '03', '07', '05', '08'];

// 1. Hero Showcase (02 Nano Banana T-Shirt): Night xenon flash sequence emerging from #08080A Spark
export const ACT1_HERO_PRODUCT_ID = '02';
export const ACT1_HERO_FRAMES = [
  {
    stem: '02_a_banana_tee_candid',
    aspect: 3712 / 4608,
    focalX: 0.50,
    focalY: 0.40,
  },
  {
    stem: '02_c_banana_tee_chest_flash',
    aspect: 3712 / 4608,
    focalX: 0.50,
    focalY: 0.55,
  },
  {
    stem: '02_d_banana_tee_back_collar',
    aspect: 3712 / 4608,
    focalX: 0.50,
    focalY: 0.43,
  },
];

// 2. Sweatshirt Showcase (01): #1F34FF Cobalt 62/38 Architectural Shutter Monolith
export const SWEATSHIRT_SHOWCASE = {
  productId: '01',
  anchorStem: '01_a_sweatshirt_wide',
  shutterStems: [
    '01_b_sweatshirt_medium',
    '01_c_sweatshirt_front_macro',
    '01_d_sweatshirt_back_collar',
  ],
};

// 3. Black Tee Showcase (06): #08080A Cobalt Spotlight Cone & Shutter-Echo Sequence
export const BLACK_TEE_FRAMES = [
  { stem: '06_d_black_tee_full', objectPosition: '50% 34%' },
  { stem: '06_a_black_tee_shutter', objectPosition: '50% 24%' },
  { stem: '06_b_black_tee_crouch', objectPosition: '50% 42%' },
  { stem: '06_c_black_tee_chest_macro', objectPosition: '50% 50%' },
];

// 4. Sports Socks Showcase (04): #131418 28-Deg Diagonal Stepped Triptych
export const SOCKS_TRIPTYCH = [
  { stem: '04_a_socks_overhead_trio', alt: 'Nano Banana Sports Socks diagonal trio' },
  { stem: '04_b_socks_pavement_stride', alt: 'Nano Banana Sports Socks pavement stride' },
  { stem: '04_c_socks_ankle_macro', alt: 'Nano Banana Sports Socks ankle embroidery' },
];

// 5. Tote Bag Showcase (03): #08080A 180-Deg Y-Axis Dual-Sided Canvas Flip
export const TOTE_SHOWCASE = {
  productId: '03',
  frontStem: '03_b_tote_side_a_carry',
  backStem: '03_c_tote_side_b_closeup',
  flankLeftStem: '03_a_tote_overhead_walk',
  flankRightStem: '03_d_tote_curb_still',
};

// 6. Insulated Bottle Showcase (07): #08080A High-Velocity Camera-Pan Arrest
export const BOTTLE_FRAMES = [
  { stem: '07_a_bottle_pan_blur', alt: 'Gemini Insulated Bottle motion pan' },
  { stem: '07_b_bottle_hand_reach', alt: 'Gemini Insulated Bottle foreground grip' },
  { stem: '07_c_bottle_basalt_macro', alt: 'Gemini Insulated Bottle on black basalt' },
];

// 7. Pin Badge Showcase (05): #1F34FF Cobalt Continuous Focal-Point Macro Zoom
export const PIN_ZOOM_STAGES = [
  { stem: '05_b_pin_night_portrait', originX: '62.8%', originY: '58.6%' },
  { stem: '05_a_pin_collar_flash', originX: '59.0%', originY: '51.2%' },
  { stem: '05_c_pin_enamel_macro', originX: '51.5%', originY: '49.0%' },
];

// 8. Sticker Pack Showcase (08): #08080A Horizontal 4-Surface Foil Rail
export const STICKER_SURFACES = [
  { stem: '08_a_stickers_concrete_sheet', alt: 'Gemini Holographic Sticker Pack kiss-cut sheet' },
  { stem: '08_b_stickers_laptop_metal', alt: 'Gemini Holographic Sticker Pack on anodized metal' },
  { stem: '08_c_stickers_polycarbonate_peel', alt: 'Gemini Holographic Sticker Pack foil peel' },
  { stem: '08_d_stickers_steel_street', alt: 'Gemini Holographic Sticker Pack on street steel' },
];

// Curated 4-Piece Complete Set (#131418 Slate Asymmetric Spread)
export const ACT4_SPREAD_ITEMS = [
  {
    marker: '(a)',
    productId: '01',
    shortName: 'Nano Banana Sweatshirt',
    priceFormatted: 'GBP £77.00',
    priceCents: 7700,
    primaryStem: '01_a_sweatshirt_wide',
    hoverStem: '01_d_sweatshirt_back_collar',
    aspect: '3 / 4',
    parallaxY: -28,
    slotClass: 'spread-frame-a',
  },
  {
    marker: '(b)',
    productId: '03',
    shortName: 'Nano Banana Tote Bag',
    priceFormatted: 'GBP £24.00',
    priceCents: 2400,
    primaryStem: '03_a_tote_overhead_walk',
    hoverStem: '03_c_tote_side_b_closeup',
    aspect: '4 / 5',
    parallaxY: 22,
    slotClass: 'spread-frame-b',
  },
  {
    marker: '(c)',
    productId: '08',
    shortName: 'Gemini Holographic Sticker Pack',
    priceFormatted: 'GBP £9.16',
    priceCents: 916,
    primaryStem: '08_b_stickers_laptop_metal',
    hoverStem: '08_c_stickers_polycarbonate_peel',
    aspect: '4 / 5',
    parallaxY: -18,
    slotClass: 'spread-frame-c',
  },
  {
    marker: '(d)',
    productId: '05',
    shortName: 'Nano Banana Pin Badge',
    priceFormatted: 'GBP £7.00',
    priceCents: 700,
    primaryStem: '05_a_pin_collar_flash',
    hoverStem: '05_b_pin_night_portrait',
    aspect: '1 / 1',
    parallaxY: 16,
    slotClass: 'spread-frame-d',
  },
];

// Real item sum: £77 + £24 + £9.16 + £7 = £117.16, rounded down to nearest £10 figure -> £110.00
export const ACT4_SET_RAW_TOTAL_CENTS = ACT4_SPREAD_ITEMS.reduce(
  (sum, item) => sum + item.priceCents,
  0
);
export const ACT4_SET_TOTAL_CENTS = Math.floor(ACT4_SET_RAW_TOTAL_CENTS / 1000) * 1000;
export const ACT4_SET_TOTAL_FORMATTED = `GBP £${(ACT4_SET_TOTAL_CENTS / 100).toFixed(2)}`;
export const OFFICIAL_BRAND_STORE_URL = 'https://your.merch.google/brands/gemini.html';
