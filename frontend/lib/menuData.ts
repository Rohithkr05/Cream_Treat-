/**
 * Single source of truth for Cream Treat editorial menu.
 * Prices are strictly in INR (tabular numbers).
 * Edit items and prices here without touching presentation layout.
 */

export interface MenuItem {
  name: string;
  price: number;
  hasPhoto?: boolean;
  image?: string;
  alt?: string;
}

export interface MenuSubgroup {
  title: string;
  items: MenuItem[];
}

export interface SectionPhoto {
  name: string;
  price: number;
  image: string;
  alt: string;
}

export interface MenuSectionData {
  id: string;
  title: string;
  tagline: string;
  theme: 'light' | 'dark'; // 'light' = #FBF7F2 bg / #6A0019 text; 'dark' = #6A0019 bg / #EFE6DC text
  imagePlacement: 'left' | 'right'; // Alternating layout rhythm
  photos: SectionPhoto[];
  subgroups?: MenuSubgroup[];
  items?: MenuItem[];
  note?: string;
}

export const MENU_SECTIONS: MenuSectionData[] = [
  {
    id: 'sundae',
    title: 'Sundae',
    tagline: 'Desserts & Faloodas',
    theme: 'light',
    imagePlacement: 'left',
    photos: [
      {
        name: 'Chocolava cake sundae',
        price: 160,
        image: '/images/chocolava-cake-sundae.jpg',
        alt: 'Chocolava cake sundae with vanilla scoop and warm chocolate fudge',
      },
      {
        name: 'Death by chocolate',
        price: 245,
        image: '/images/death-by-chocolate.jpg',
        alt: 'Death by chocolate layered sundae in a glass goblet',
      },
      {
        name: 'Brownie sundae',
        price: 180,
        image: '/images/brownie-sundae.jpg',
        alt: 'Fudge brownie sundae topped with ice cream',
      },
      {
        name: 'Banana split',
        price: 195,
        image: '/images/banana-split.jpg',
        alt: 'Banana split with scoops of ice cream and cherries on top',
      },
      {
        name: 'Hot chocolate fudge',
        price: 200,
        image: '/menu/hot-chocolate-fudge.jpg',
        alt: 'Hot chocolate fudge sundae with warm chocolate fudge and nuts',
      },
      {
        name: 'Gadbad',
        price: 200,
        image: '/menu/gadbud.jpg',
        alt: 'Gadbad layered ice cream sundae with fruits and nuts',
      },
      {
        name: 'Biscoff sundae',
        price: 225,
        image: '/menu/biscoff-sundae.jpg',
        alt: 'Lotus Biscoff sundae with cookie crumble and spread',
      },
      {
        name: 'Rose falooda',
        price: 220,
        image: '/menu/rose-falooda.jpg',
        alt: 'Rose falooda layered dessert with sabja seeds and kulfi',
      },
      {
        name: 'Royal falooda',
        price: 220,
        image: '/menu/royal-falooda.jpg',
        alt: 'Royal falooda with saffron milk and dry fruits',
      },
    ],
    items: [
      { name: 'Chocolava cake sundae', price: 160, hasPhoto: true },
      { name: 'Death by chocolate', price: 245, hasPhoto: true },
      { name: 'Brownie sundae', price: 180, hasPhoto: true },
      { name: 'Hot chocolate fudge', price: 200, hasPhoto: true },
      { name: 'Banana split', price: 195, hasPhoto: true },
      { name: 'Rose falooda', price: 220, hasPhoto: true },
      { name: 'Royal falooda', price: 220, hasPhoto: true },
      { name: 'Gadbad', price: 200, hasPhoto: true },
      { name: 'Biscoff sundae', price: 225, hasPhoto: true },
    ],
  },
  {
    id: 'milkshake',
    title: 'Milkshake',
    tagline: 'Beverages & Shakes',
    theme: 'light',
    imagePlacement: 'right',
    photos: [
      {
        name: 'Hazelnut bubble milk',
        price: 190,
        image: '/menu/hazelnut-bubble-milk-v2.jpg',
        alt: 'Hazelnut bubble milk with brown sugar tapioca pearls',
      },
      {
        name: 'Strawberry milkshake',
        price: 110,
        image: '/menu/strawberry-milkshake-v2.jpg',
        alt: 'Strawberry milkshake with whipped cream and fresh strawberry',
      },
      {
        name: 'Oreo milkshake',
        price: 115,
        image: '/menu/oreo-milkshake-v2.jpg',
        alt: 'Oreo milkshake topped with whipped cream and crushed cookies',
      },
      {
        name: 'Classic cold coffee',
        price: 110,
        image: '/menu/classic-cold-coffee-v2.jpg',
        alt: 'Classic chilled cold coffee with creamy milk swirl',
      },
    ],
    subgroups: [
      {
        title: 'Shakes & Milk',
        items: [
          { name: 'Rose milk', price: 85, hasPhoto: true },
          { name: 'Chocolate milkshake', price: 110, hasPhoto: true },
          { name: 'Vanilla milkshake', price: 110, hasPhoto: true },
          { name: 'Kitkat milkshake', price: 120, hasPhoto: true },
          { name: 'Biscoff milkshake', price: 125, hasPhoto: true },
          { name: 'Nutella milkshake', price: 135, hasPhoto: true },
          { name: 'Strawberry milkshake', price: 110, hasPhoto: true },
          { name: 'Oreo milkshake', price: 115, hasPhoto: true },
        ],
      },
      {
        title: 'Cold Coffee',
        items: [
          { name: 'Classic cold coffee', price: 110, hasPhoto: true },
          { name: 'Hazelnut cold coffee', price: 125, hasPhoto: true },
          { name: 'Salted caramel cold coffee', price: 125, hasPhoto: true },
        ],
      },
      {
        title: 'Bubble Milk',
        items: [
          { name: 'Hazelnut bubble milk', price: 190, hasPhoto: true },
          { name: 'Chocolate bubble milk', price: 180, hasPhoto: true },
          { name: 'Coffee bubble milk', price: 170, hasPhoto: true },
          { name: 'Berry blast bubble milk', price: 190, hasPhoto: true },
        ],
      },
    ],
  },
  {
    id: 'mains',
    title: 'Mains',
    tagline: 'Burgers & Sandwiches',
    theme: 'light',
    imagePlacement: 'left',
    photos: [
      {
        name: 'Veg grilled sandwich',
        price: 95,
        image: '/menu/veg-grilled-sandwich-v2.jpg',
        alt: 'Toasted veg grilled sandwich with golden grill marks',
      },
      {
        name: 'Veg burger',
        price: 120,
        image: '/images/veg-burger.jpg',
        alt: 'Crispy veg patty burger with lettuce and sesame seed bun',
      },
      {
        name: 'Herb chilli burger',
        price: 115,
        image: '/menu/herb-chilli-burger.jpg',
        alt: 'Crisp herb chilli burger with spicy sauce on a sesame bun',
      },
      {
        name: 'Paneer burger',
        price: 150,
        image: '/menu/paneer-burger.jpg',
        alt: 'Crispy crumb-fried paneer block patty burger with tandoori mayo',
      },
      {
        name: 'Chilli cheese sandwich',
        price: 75,
        image: '/menu/chilli-cheese-sandwich-v2.jpg',
        alt: 'Toasted chilli cheese sandwich with green chillies',
      },
      {
        name: 'Corn cheese sandwich',
        price: 105,
        image: '/menu/corn-cheese-sandwich-v2.jpg',
        alt: 'Golden grilled sandwich with sweet corn and melted cheese',
      },
      {
        name: 'Paneer grilled sandwich',
        price: 135,
        image: '/menu/paneer-grilled-sandwich.jpg',
        alt: 'Spiced paneer grilled sandwich with golden grill marks',
      },
      {
        name: 'Pizza sandwich',
        price: 115,
        image: '/menu/pizza-sandwich-v2.jpg',
        alt: 'Italian seasoned pizza grilled sandwich with mozzarella',
      },
      {
        name: 'Chocolate sandwich',
        price: 95,
        image: '/images/chocolate-sandwich.jpg',
        alt: 'Decadent grilled sandwich with chocolate drizzle',
      },
    ],
    subgroups: [
      {
        title: 'Sandwiches',
        items: [
          { name: 'Veg grilled sandwich', price: 95, hasPhoto: true },
          { name: 'Paneer grilled sandwich', price: 135, hasPhoto: true },
          { name: 'Chilli cheese sandwich', price: 75, hasPhoto: true },
          { name: 'Pizza sandwich', price: 115, hasPhoto: true },
          { name: 'Corn cheese sandwich', price: 105, hasPhoto: true },
          { name: 'Chocolate sandwich', price: 95, hasPhoto: true },
        ],
      },
      {
        title: 'Burgers',
        items: [
          { name: 'Veg burger', price: 120, hasPhoto: true },
          { name: 'Herb chilli burger', price: 115, hasPhoto: true },
          { name: 'Paneer burger', price: 150, hasPhoto: true },
        ],
      },
    ],
  },
  {
    id: 'cheat-meal',
    title: 'Cheat Meal',
    tagline: 'Maggi & Fries',
    theme: 'light',
    imagePlacement: 'right',
    photos: [
      {
        name: 'Cheese maggi',
        price: 70,
        image: '/images/cheese-maggi.jpg',
        alt: 'Bowl of steaming spiced Maggi noodles topped with melted cheese',
      },
      {
        name: 'Corn cheese maggi',
        price: 75,
        image: '/images/corn-cheese-maggi.jpg',
        alt: 'Noodles tossed with sweet corn kernels and melted cheese',
      },
      {
        name: 'Masala maggi',
        price: 55,
        image: '/menu/masala-maggi-v2.jpg',
        alt: 'Authentic street-style seasoned vegetable spice noodles',
      },
      {
        name: 'Chilli oil maggi',
        price: 80,
        image: '/menu/chilli-oil-maggi.jpg',
        alt: 'Fiery roasted garlic chilli oil drizzled over steaming noodles',
      },
      {
        name: 'Veg maggi',
        price: 80,
        image: '/menu/veg-maggi-v2.jpg',
        alt: 'Fresh crunchy vegetables cooked with aromatic noodle spices',
      },
      {
        name: 'Lemon coriander maggi',
        price: 85,
        image: '/menu/lemon-coriander-maggi.jpg',
        alt: 'Zesty fresh lemon and fragrant chopped coriander noodles',
      },
      {
        name: 'Classic french fries',
        price: 110,
        image: '/images/classic-french-fries.jpg',
        alt: 'Crisp golden french fries in a kraft cup',
      },
      {
        name: 'Cheese french fries',
        price: 140,
        image: '/images/cheese-french-fries.jpg',
        alt: 'Golden fries drenched in warm melted cheese sauce and herbs',
      },
      {
        name: 'Peri peri french fries',
        price: 125,
        image: '/menu/peri-peri-french-fries.jpg',
        alt: 'Crisp potato fries dusted with zesty peri peri spice',
      },
    ],
    subgroups: [
      {
        title: 'Maggi',
        items: [
          { name: 'Masala maggi', price: 55, hasPhoto: true },
          { name: 'Chilli oil maggi', price: 80, hasPhoto: true },
          { name: 'Veg maggi', price: 80, hasPhoto: true },
          { name: 'Lemon coriander maggi', price: 85, hasPhoto: true },
          { name: 'Cheese maggi', price: 70, hasPhoto: true },
          { name: 'Corn cheese maggi', price: 75, hasPhoto: true },
        ],
      },
      {
        title: 'French Fries',
        items: [
          { name: 'Classic french fries', price: 110, hasPhoto: true },
          { name: 'Cheese french fries', price: 140, hasPhoto: true },
          { name: 'Peri peri french fries', price: 125, hasPhoto: true },
        ],
      },
    ],
  },
  {
    id: 'sides',
    title: 'Sides',
    tagline: 'Quick Bites',
    theme: 'light',
    imagePlacement: 'left',
    photos: [
      {
        name: 'Onion rings',
        price: 125,
        image: '/images/onion-rings.jpg',
        alt: 'Crispy golden batter-fried onion rings',
      },
      {
        name: 'Hara bara bites',
        price: 115,
        image: '/images/hara-bara-bites.jpg',
        alt: 'Spiced spinach and paneer hara bara bites with mint dip',
      },
      {
        name: 'Chilli garlic potato bites',
        price: 130,
        image: '/images/chilli-garlic-potato-bites.jpg',
        alt: 'Crispy chilli garlic potato bites in a wire basket',
      },
      {
        name: 'Potato cheese shots',
        price: 95,
        image: '/images/potato-cheese-shots.jpg',
        alt: 'Golden crunchy potato cheese shots with gooey cheese pull',
      },
      {
        name: 'Cheese jalapeno bites',
        price: 125,
        image: '/menu/cheese-jalapeno-bites.jpg',
        alt: 'Cheesy bites loaded with diced spicy pickled jalapeno peppers',
      },
      {
        name: 'Lebanese falafel bites',
        price: 125,
        image: '/menu/lebanese-falafels-bites.jpg',
        alt: 'Traditional herbed chickpea patties served with tahini sauce',
      },
      {
        name: 'Veg fingers',
        price: 125,
        image: '/menu/veg-fingers.jpg',
        alt: 'Breaded crunchy vegetable fingers served with garlic dip',
      },
      {
        name: 'Veg nuggets',
        price: 115,
        image: '/menu/veg-nuggets.jpg',
        alt: 'Golden fried crispy vegetarian nuggets',
      },
    ],
    items: [
      { name: 'Onion rings', price: 125, hasPhoto: true },
      { name: 'Potato cheese shots', price: 95, hasPhoto: true },
      { name: 'Cheese jalapeno bites', price: 125, hasPhoto: true },
      { name: 'Lebanese falafel bites', price: 125, hasPhoto: true },
      { name: 'Veg fingers', price: 125, hasPhoto: true },
      { name: 'Veg nuggets', price: 115, hasPhoto: true },
      { name: 'Hara bara bites', price: 115, hasPhoto: true },
      { name: 'Chilli garlic potato bites', price: 130, hasPhoto: true },
    ],
  },
  {
    id: 'mojito',
    title: 'Mojito',
    tagline: 'Coolers & Lassi',
    theme: 'light',
    imagePlacement: 'right',
    photos: [
      {
        name: 'Mint mojito',
        price: 100,
        image: '/menu/mint-mojito-v2.jpg',
        alt: 'Fresh mint mojito in a tall glass with lime and ice',
      },
      {
        name: 'Blue lime mojito',
        price: 100,
        image: '/menu/blue-lime-mojito-v2.jpg',
        alt: 'Vibrant blue lime cooler garnished with fresh mint',
      },
      {
        name: 'Passionfruit mojito',
        price: 110,
        image: '/menu/passionfruit-mojito-v2.jpg',
        alt: 'Tropical passionfruit mojito with crushed ice and mint',
      },
    ],
    subgroups: [
      {
        title: 'Mojitos',
        items: [
          { name: 'Mint mojito', price: 100, hasPhoto: true },
          { name: 'Blue lime mojito', price: 100, hasPhoto: true },
          { name: 'Green apple mojito', price: 110, hasPhoto: true },
          { name: 'Cranberry mojito', price: 110, hasPhoto: true },
          { name: 'Passionfruit mojito', price: 110, hasPhoto: true },
        ],
      },
      {
        title: 'Lassi',
        items: [
          { name: 'Sweet lassi', price: 70, hasPhoto: true },
          { name: 'Mango lassi', price: 85, hasPhoto: true },
          { name: 'Strawberry lassi', price: 85, hasPhoto: true },
          { name: 'Rose lassi', price: 85, hasPhoto: true },
        ],
      },
    ],
    note: 'Fresh fruit juice available as per season.',
  },
];
