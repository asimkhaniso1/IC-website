/**
 * Curated Pantone Coated reference library shown as a secondary color
 * reference alongside the Interconverters internal yarn shade card.
 *
 * Approximate on-screen simulations of Pantone references for guidance
 * only — physical shade cards govern production color matching.
 */
export interface PantoneReference {
  code: string;
  name: string;
  hex: string;
}

export const PANTONE_REFERENCES: PantoneReference[] = [
  // Blacks / greys / whites
  { code: 'Black C', name: 'Black', hex: '#2d2926' },
  { code: 'Black 6 C', name: 'Rich Black', hex: '#26282a' },
  { code: 'Cool Gray 1 C', name: 'Pale Grey', hex: '#d9d6d2' },
  { code: 'Cool Gray 5 C', name: 'Light Grey', hex: '#b1b3b3' },
  { code: 'Cool Gray 9 C', name: 'Grey', hex: '#75787b' },
  { code: 'Cool Gray 11 C', name: 'Charcoal Grey', hex: '#53565a' },
  { code: 'Warm Gray 4 C', name: 'Warm Grey', hex: '#bfb8af' },
  { code: '7541 C', name: 'Ice Grey', hex: '#dce1e6' },
  { code: 'White', name: 'Optic White', hex: '#ffffff' },

  // Navy family
  { code: '289 C', name: 'Navy', hex: '#041e42' },
  { code: '533 C', name: 'Dusty Navy', hex: '#43485c' },
  { code: '5395 C', name: 'Steel Navy', hex: '#6d7b8d' },
  { code: '5405 C', name: 'Slate Navy', hex: '#55697d' },

  // Blues
  { code: '286 C', name: 'Blue', hex: '#0032a0' },
  { code: '300 C', name: 'Process Blue', hex: '#0072ce' },
  { code: '279 C', name: 'Sky Blue', hex: '#61a0dc' },
  { code: '2935 C', name: 'Royal Blue', hex: '#0046ad' },
  { code: '634 C', name: 'Turquoise Blue', hex: '#0090b2' },
  { code: '305 C', name: 'Light Turquoise', hex: '#00a9ce' },

  // Reds
  { code: '186 C', name: 'Red', hex: '#c8102e' },
  { code: '199 C', name: 'True Red', hex: '#d50032' },
  { code: '485 C', name: 'Fire Red', hex: '#da291c' },
  { code: '032 C', name: 'Bright Red', hex: '#ef3340' },

  // Bordeaux / maroon
  { code: '209 C', name: 'Dusty Bordeaux', hex: '#983a45' },
  { code: '188 C', name: 'Bordeaux', hex: '#6e273d' },
  { code: '505 C', name: 'Maroon', hex: '#822433' },
  { code: '1955 C', name: 'Rich Maroon', hex: '#a6093d' },

  // Greens
  { code: '349 C', name: 'Bottle Green', hex: '#00543c' },
  { code: '355 C', name: 'Green', hex: '#00b140' },
  { code: '361 C', name: 'Bright Green', hex: '#43b02a' },
  { code: '3425 C', name: 'Forest Green', hex: '#00594c' },
  { code: '342 C', name: 'Emerald Green', hex: '#007a53' },

  // Olives
  { code: '5767 C', name: 'Olive', hex: '#6c6b4f' },
  { code: '5825 C', name: 'Olive Drab', hex: '#7f7259' },
  { code: '574 C', name: 'Light Olive', hex: '#a9a98d' },

  // Yellows
  { code: '102 C', name: 'Yellow', hex: '#f7ea48' },
  { code: '116 C', name: 'Golden Yellow', hex: '#ffcd00' },
  { code: 'Yellow C', name: 'Process Yellow', hex: '#fedd00' },

  // Golds
  { code: '872 C', name: 'Metallic Gold', hex: '#8a6d3b' },
  { code: '1245 C', name: 'Gold', hex: '#c68a2e' },
  { code: '7406 C', name: 'Amber Gold', hex: '#eaaa00' },

  // Oranges
  { code: '172 C', name: 'Orange Red', hex: '#fa4616' },
  { code: '021 C', name: 'Orange', hex: '#fe5000' },
  { code: '1585 C', name: 'Bright Orange', hex: '#ff8200' },

  // Pinks
  { code: '219 C', name: 'Pink', hex: '#d0006f' },
  { code: '226 C', name: 'Fuchsia', hex: '#e10098' },
  { code: '705 C', name: 'Pale Pink', hex: '#f2c6de' },

  // Purples
  { code: '267 C', name: 'Purple', hex: '#6e3fa3' },
  { code: '2685 C', name: 'Deep Purple', hex: '#330072' },
  { code: '2607 C', name: 'Violet', hex: '#7d3ac1' },

  // Browns
  { code: '469 C', name: 'Brown', hex: '#6f4e37' },
  { code: '4625 C', name: 'Dark Brown', hex: '#4a2e23' },
  { code: '730 C', name: 'Cognac', hex: '#a9772f' },

  // Beiges / khakis
  { code: '7500 C', name: 'Beige', hex: '#d9c7a7' },
  { code: '468 C', name: 'Tan', hex: '#c9b49a' },
  { code: '7527 C', name: 'Stone', hex: '#cbbfa9' },
  { code: '7401 C', name: 'Khaki Cream', hex: '#e6d6a8' },
  { code: '727 C', name: 'Camel', hex: '#c7a76c' },
  { code: '424 C', name: 'Medium Grey Beige', hex: '#85898c' },
];
