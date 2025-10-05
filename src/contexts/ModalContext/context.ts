import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface ModalContextType {
  isAnyModalOpen: boolean;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

export interface ModalProviderProps {
  children: ReactNode;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);
