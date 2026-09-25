/* eslint-disable react-refresh/only-export-components */
import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import type {CoinsEntry, CoinsTarget} from '../types/coins';
import {StorageService} from '../services/storage';
import {addAppEventListener} from '../utils/events';

interface CoinsContextType {
    coinsEntries: CoinsEntry[];
    setCoinsEntries: React.Dispatch<React.SetStateAction<CoinsEntry[]>>;
    coinsTargets: CoinsTarget;
    setCoinsTargets: React.Dispatch<React.SetStateAction<CoinsTarget>>;
    persistEntries: (entries: CoinsEntry[]) => void;
    persistTargets: (targets: CoinsTarget) => void;
}

const CoinsContext = createContext<CoinsContextType | null>(null);

export const CoinsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [coinsEntries, setCoinsEntries] = useState<CoinsEntry[]>(() => {
        return StorageService.getItem<CoinsEntry[]>('whatchadoin_coins_entries', []);
    });

    const [coinsTargets, setCoinsTargets] = useState<CoinsTarget>(() => {
        return StorageService.getItem<CoinsTarget>('whatchadoin_coins_targets', {});
    });

    const persistEntries = useCallback((entries: CoinsEntry[]) => {
        setCoinsEntries(entries);
        StorageService.setItemImmediate('whatchadoin_coins_entries', entries);
    }, []);

    const persistTargets = useCallback((targets: CoinsTarget) => {
        setCoinsTargets(targets);
        StorageService.setItemImmediate('whatchadoin_coins_targets', targets);
    }, []);

    useEffect(() => {
        const handleCoinsUpdated = () => {
            const freshEntries = StorageService.getItem<CoinsEntry[]>('whatchadoin_coins_entries', []);
            setCoinsEntries(freshEntries);
            const freshTargets = StorageService.getItem<CoinsTarget>('whatchadoin_coins_targets', {});
            setCoinsTargets(freshTargets);
        };

        return addAppEventListener('whatchadoin_coins_updated', handleCoinsUpdated);
    }, []);

    return (
        <CoinsContext.Provider value={{
            coinsEntries,
            setCoinsEntries,
            coinsTargets,
            setCoinsTargets,
            persistEntries,
            persistTargets
        }}>
            {children}
        </CoinsContext.Provider>
    );
};

export function useCoins(): CoinsContextType {
    const context = useContext(CoinsContext);
    if (!context) {
        throw new Error('useCoins must be used within a CoinsProvider');
    }
    return context;
}
