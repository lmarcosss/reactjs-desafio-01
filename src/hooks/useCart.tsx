import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

      if (!productStock) {
        throw Error;
      }

      const findedProduct = cart.find((product) => product.id === productId);

      if (!findedProduct) {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        const newProduct = { ...product, amount: 1 };
        const newCart = [...cart, newProduct];

        if (newProduct.amount > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        return setCart(newCart);
      } 

      updateProductAmount({ productId, amount: findedProduct.amount + 1 });
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findedProduct = cart.find((product) => product.id === productId);

      if (!findedProduct) {
        toast.error('Erro na remoção do produto');
        return
      }

      const newCart = cart.filter((product) => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1 ) {
        return;
      }
      
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);
      const findedProduct = cart.find((product) => product.id === productId);

      if (!findedProduct && !productStock) {
        throw Error;
      }

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;

      }

      const newCart = cart.map((product) => {
        if (productId === product.id) {
          return { ...product, amount }
        }

        return product;
      })

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
