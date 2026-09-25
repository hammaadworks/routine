/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { LifeGoal, MoneyGoal, WalletGoal } from '../types/goals';
import { StorageService } from '../services/storage';
import { getAllWalletGoals } from '../utils';
import { useRoutine } from './RoutineContext';

interface GoalsContextType {
    lifeGoals: LifeGoal[];
    setLifeGoals: React.Dispatch<React.SetStateAction<LifeGoal[]>>;
    moneyGoals: MoneyGoal[];
    setMoneyGoals: React.Dispatch<React.SetStateAction<MoneyGoal[]>>;
    allWalletGoals: WalletGoal[];
    headerWalletTotal: number;
}

const GoalsContext = createContext<GoalsContextType | null>(null);

export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { routineGoals } = useRoutine();
    const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>(() => {
        return StorageService.getItem<LifeGoal[]>('whatchadoin_life_goals', []);
    });

    const [moneyGoals, setMoneyGoals] = useState<MoneyGoal[]>(() => {
        return StorageService.getItem<MoneyGoal[]>('whatchadoin_money_goals', []);
    });

    useEffect(() => {
        StorageService.setItemDebounced('whatchadoin_life_goals', lifeGoals, 200);
    }, [lifeGoals]);

    useEffect(() => {
        StorageService.setItemDebounced('whatchadoin_money_goals', moneyGoals, 200);
    }, [moneyGoals]);

    const allWalletGoals = useMemo(() => {
        return getAllWalletGoals(lifeGoals, routineGoals, moneyGoals);
    }, [lifeGoals, routineGoals, moneyGoals]);

    const headerWalletTotal = useMemo(() => {
        return allWalletGoals.reduce((sum, g) => sum + (Number(g.cost) || 0), 0);
    }, [allWalletGoals]);

    return (
        <GoalsContext.Provider value={{
            lifeGoals,
            setLifeGoals,
            moneyGoals,
            setMoneyGoals,
            allWalletGoals,
            headerWalletTotal
        }}>
            {children}
        </GoalsContext.Provider>
    );
};

export function useGoals(): GoalsContextType {
    const context = useContext(GoalsContext);
    if (!context) {
        throw new Error('useGoals must be used within a GoalsProvider');
    }
    return context;
}
