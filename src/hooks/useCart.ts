import { useState, useEffect } from 'react';
import { Cart, HotDogItem, DrinkCartItem, MenuItem } from '../types';

const LOCAL_STORAGE_KEY = 'divino_lanches_cart';

export function useCart(drinksMenu: MenuItem[]) {
  const [cart, setCart] = useState<Cart>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao recuperar carrinho', e);
    }
    return { hotDogs: [], drinks: [] };
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const handleAddHotDog = (newDog: Omit<HotDogItem, 'id'>) => {
    setCart((prev) => {
      const matchIdx = prev.hotDogs.findIndex(
        (dog) =>
          dog.type === newDog.type &&
          JSON.stringify(dog.baseToppings) === JSON.stringify(newDog.baseToppings) &&
          JSON.stringify(dog.extras) === JSON.stringify(newDog.extras) &&
          dog.notes === newDog.notes
      );

      if (matchIdx !== -1) {
        const updated = [...prev.hotDogs];
        updated[matchIdx].quantity += newDog.quantity;
        return { ...prev, hotDogs: updated };
      } else {
        const uniqueId = `dog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        return {
          ...prev,
          hotDogs: [...prev.hotDogs, { ...newDog, id: uniqueId }],
        };
      }
    });
  };

  const handleRemoveHotDog = (id: string) => {
    setCart((prev) => ({
      ...prev,
      hotDogs: prev.hotDogs.filter((dog) => dog.id !== id),
    }));
  };

  const handleUpdateHotDogQty = (id: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.hotDogs
        .map((dog) => {
          if (dog.id === id) {
            return { ...dog, quantity: Math.max(1, dog.quantity + delta) };
          }
          return dog;
        })
        .filter((dog) => dog.quantity > 0);
      return { ...prev, hotDogs: updated };
    });
  };

  const handleUpdateDrinkQty = (drinkId: string, delta: number) => {
    setCart((prev) => {
      const existingIdx = prev.drinks.findIndex((d) => d.drinkId === drinkId);
      const drinkInfo = drinksMenu.find((d) => d.id === drinkId);

      if (!drinkInfo) return prev;

      if (existingIdx !== -1) {
        const updated = [...prev.drinks];
        const newQty = updated[existingIdx].quantity + delta;
        if (newQty <= 0) {
          updated.splice(existingIdx, 1);
        } else {
          updated[existingIdx].quantity = newQty;
        }
        return { ...prev, drinks: updated };
      } else if (delta > 0) {
        const newCartItem: DrinkCartItem = {
          id: `drink_${Date.now()}`,
          drinkId,
          name: drinkInfo.name,
          price: drinkInfo.price,
          quantity: delta,
        };
        return {
          ...prev,
          drinks: [...prev.drinks, newCartItem],
        };
      }
      return prev;
    });
  };

  const handleClearCart = () => {
    setCart({ hotDogs: [], drinks: [] });
  };

  const cartCount = cart.hotDogs.reduce((sum, item) => sum + item.quantity, 0) + 
                    cart.drinks.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.hotDogs.reduce((sum, item) => sum + item.price * item.quantity, 0) + 
                   cart.drinks.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    cart,
    cartCount,
    subtotal,
    handleAddHotDog,
    handleRemoveHotDog,
    handleUpdateHotDogQty,
    handleUpdateDrinkQty,
    handleClearCart
  };
}
