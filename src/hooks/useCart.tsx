import { createContext, ReactNode, useContext, useState } from 'react';
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

    if (storagedCart) return JSON.parse(storagedCart);

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCartList = [...cart];
      const productCartExists = updatedCartList.find((product) => product.id === productId);

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      const currentProductAmount = productCartExists ? productCartExists.amount : 0;
      const amount = currentProductAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productCartExists) {
        productCartExists.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        const newProductCart = {
          ...product.data,
          amount: 1,
        };

        updatedCartList.push(newProductCart);
      }

      setCart(updatedCartList);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartList));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCartList = [...cart];
      const productIndex = updatedCartList.findIndex((product) => product.id === productId);

      if (productIndex >= 0) {
        updatedCartList.splice(productIndex, 1);
        setCart(updatedCartList);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartList));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCartList = [...cart];
      const productCartExists = updatedCartList.find((product) => product.id === productId);

      if (productCartExists) {
        productCartExists.amount = amount;
        setCart(updatedCartList);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCartList));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
