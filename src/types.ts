export type HotDogType = 'boi' | 'frango' | 'calabresa' | 'boi_frango' | 'boi_calabresa' | 'frango_calabresa';

export interface BaseToppings {
  milhoErvilha: boolean;
  vinagrete: boolean;
  cenoura: boolean;
  batataPalha: boolean;
}

export interface ExtraToppings {
  queijo: boolean;
  molhoEspecial: boolean;
  molhoVerde: boolean;
  molhoBarbecue: boolean;
}

export interface HotDogItem {
  id: string; // unique item id in cart
  type: HotDogType;
  baseToppings: BaseToppings;
  extras: ExtraToppings;
  quantity: number;
  notes?: string;
  price: number;
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export interface DrinkCartItem {
  id: string; // dynamic cart id
  drinkId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  hotDogs: HotDogItem[];
  drinks: DrinkCartItem[];
}

export type OrderType = 'retirada' | 'entrega';

export interface CustomerOrder {
  name: string;
  phone: string;
  orderType: OrderType;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    reference?: string;
  };
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  changeFor?: string; // Troco para
}

export interface NeighborhoodFee {
  name: string;
  fee: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface SavedOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: 'retirada' | 'entrega';
  street?: string;
  num?: string;
  neighborhood?: string;
  reference?: string;
  paymentMethod: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
  changeFor?: string;
  hotDogs: Array<{
    type: string;
    quantity: number;
    price: number;
    details: string;
  }>;
  drinks: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  timestamp: string;
  confirmed?: boolean;
  delivered?: boolean;
}

export interface BasicIngredientConfig {
  id: string;
  name: string;
  description: string;
}

export interface ExtraConfig {
  id: string;
  name: string;
  price: number;
  description: string;
}


