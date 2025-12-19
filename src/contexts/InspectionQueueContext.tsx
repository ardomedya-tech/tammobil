import { createContext, useContext, useState, ReactNode } from 'react';

interface QueueItem {
  id: string;
  brand: string;
  model: string;
  imei: string;
  addedAt: string;
}

interface InspectionQueueContextType {
  queue: QueueItem[];
  addToQueue: (item: Omit<QueueItem, 'id' | 'addedAt'>) => void;
  removeFromQueue: (id: string) => void;
  getNextInQueue: () => QueueItem | null;
  clearQueue: () => void;
}

const InspectionQueueContext = createContext<InspectionQueueContextType | undefined>(undefined);

export const InspectionQueueProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const addToQueue = (item: Omit<QueueItem, 'id' | 'addedAt'>) => {
    const newItem: QueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
      addedAt: new Date().toISOString()
    };
    setQueue(prev => [...prev, newItem]);
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const getNextInQueue = () => {
    return queue.length > 0 ? queue[0] : null;
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <InspectionQueueContext.Provider value={{ queue, addToQueue, removeFromQueue, getNextInQueue, clearQueue }}>
      {children}
    </InspectionQueueContext.Provider>
  );
};

export const useInspectionQueue = () => {
  const context = useContext(InspectionQueueContext);
  if (!context) {
    throw new Error('useInspectionQueue must be used within InspectionQueueProvider');
  }
  return context;
};