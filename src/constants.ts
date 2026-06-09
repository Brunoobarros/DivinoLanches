import { Drink, NeighborhoodFee } from './types';

export const HOTDOG_PRICES = {
  frango: 16.0,
  boi: 15.0,
};

export const EXTRA_PRICES = {
  batataPalha: 2.0,
  queijo: 3.0,
  molhoEspecial: 1.5,
  molhoVerde: 1.5,
  molhoBarbecue: 1.5,
};

export const DRINKS_MENU: Drink[] = [
  { id: 'coca_lata', name: 'Coca-Cola (Lata)', price: 6.00 },
  { id: 'guarana_lata', name: 'Guaraná Antarctica (Lata)', price: 5.50 },
  { id: 'fanta_lata', name: 'Fanta Laranja (Lata)', price: 5.50 },
  { id: 'suco_laranja', name: 'Suco de Laranja (300ml)', price: 8.00 },
  { id: 'agua', name: 'Água Mineral Sem Gás (500ml)', price: 4.00 },
];

export const NEIGHBORHOODS: NeighborhoodFee[] = [
  { name: 'Centro', fee: 5.00 },
  { name: 'Alvorada', fee: 6.00 },
  { name: 'Novo Horizonte', fee: 7.00 },
  { name: 'Jardim Primavera', fee: 8.00 },
  { name: 'Vila Imperial', fee: 9.00 },
  { name: 'Parque das Nações', fee: 10.00 },
  { name: 'Outros (Consultar taxa)', fee: 12.00 },
];

export const WHATSAPP_NUMBER = '5511999999999'; // Placeholder or custom phone number
