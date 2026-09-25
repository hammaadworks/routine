/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CenterTab, LeftTab, MobileTab, CalendarSubTab, AIDockState, ConfirmConfig } from '../types/ui';
import { addAppEventListener } from '../utils/events';

interface UIContextType {
    activeCenterTab: CenterTab;
    setActiveCenterTab: (tab: CenterTab) => void;
    activeLeftTab: LeftTab;
    setActiveLeftTab: (tab: LeftTab) => void;
    mobileTab: MobileTab;
    setMobileTab: (tab: MobileTab) => void;
    calendarSubTab: CalendarSubTab;
    setCalendarSubTab: (tab: CalendarSubTab) => void;
    selectedTargetDate: string | null;
    setSelectedTargetDate: (d: string | null) => void;
    isPublicView: boolean;
    setIsPublicView: React.Dispatch<React.SetStateAction<boolean>>;
    aiDockState: AIDockState;
    setAiDockState: React.Dispatch<React.SetStateAction<AIDockState>>;
    isLeftPaneExpanded: boolean;
    setIsLeftPaneExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    isRoutineDrawerOpen: boolean;
    setIsRoutineDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isWalletModalOpen: boolean;
    setIsWalletModalOpen: (v: boolean) => void;
    isRoutineModalOpen: boolean;
    setIsRoutineModalOpen: (v: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (v: boolean) => void;
    confirmConfig: ConfirmConfig | null;
    setConfirmConfig: (c: ConfirmConfig | null) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCenterTab, setActiveCenterTab] = useState<CenterTab>('myday');
    const [mobileTab, setMobileTab] = useState<MobileTab>('myday');
    const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('life');
    const [calendarSubTab, setCalendarSubTab] = useState<CalendarSubTab>('mark_goals');
    const [selectedTargetDate, setSelectedTargetDate] = useState<string | null>(null);
    const [isPublicView, setIsPublicView] = useState<boolean>(() => {
        return localStorage.getItem('whatchadoin_is_public_view') === 'true';
    });
    const [aiDockState, setAiDockState] = useState<AIDockState>(() => {
        return (localStorage.getItem('whatchadoin_ai_dock_state') as AIDockState) || 'hidden';
    });
    const [isLeftPaneExpanded, setIsLeftPaneExpanded] = useState<boolean>(true);
    const [isRoutineDrawerOpen, setIsRoutineDrawerOpen] = useState<boolean>(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
    const [isRoutineModalOpen, setIsRoutineModalOpen] = useState<boolean>(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

    useEffect(() => {
        localStorage.setItem('whatchadoin_is_public_view', isPublicView ? 'true' : 'false');
    }, [isPublicView]);

    useEffect(() => {
        localStorage.setItem('whatchadoin_ai_dock_state', aiDockState);
    }, [aiDockState]);

    useEffect(() => {
        const cleanupCloseDrawer = addAppEventListener('close-routine-drawer', () => {
            setIsRoutineDrawerOpen(false);
        });
        const cleanupOpenSettings = addAppEventListener('open-settings', () => {
            setIsSettingsOpen(true);
        });
        const cleanupToggleAIDock = addAppEventListener('toggle-ai-dock', () => {
            setAiDockState(prev => prev === 'hidden' ? 'docked' : 'hidden');
        });

        return () => {
            cleanupCloseDrawer();
            cleanupOpenSettings();
            cleanupToggleAIDock();
        };
    }, []);

    return (
        <UIContext.Provider value={{
            activeCenterTab,
            setActiveCenterTab,
            activeLeftTab,
            setActiveLeftTab,
            mobileTab,
            setMobileTab,
            calendarSubTab,
            setCalendarSubTab,
            selectedTargetDate,
            setSelectedTargetDate,
            isPublicView,
            setIsPublicView,
            aiDockState,
            setAiDockState,
            isLeftPaneExpanded,
            setIsLeftPaneExpanded,
            isRoutineDrawerOpen,
            setIsRoutineDrawerOpen,
            isWalletModalOpen,
            setIsWalletModalOpen,
            isRoutineModalOpen,
            setIsRoutineModalOpen,
            isSettingsOpen,
            setIsSettingsOpen,
            confirmConfig,
            setConfirmConfig
        }}>
            {children}
        </UIContext.Provider>
    );
};

export function useUI(): UIContextType {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
