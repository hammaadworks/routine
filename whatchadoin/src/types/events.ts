export type AppEventType =
    | 'whatchadoin_currency_updated'
    | 'whatchadoin_quick_tasks_updated'
    | 'whatchadoin_coins_updated'
    | 'whatchadoin_quotes_updated'
    | 'whatchadoin_habits_updated'
    | 'close-routine-drawer'
    | 'fab:add-habits'
    | 'fab:add-myday'
    | 'fab:add-task'
    | 'fab:add-routine-goal'
    | 'fab:add-life-goal'
    | 'fab:add-money-goal'
    | 'fab:add-coins'
    | 'myday-add-habit-mobile'
    | 'open-settings'
    | 'toggle-ai-dock';

export interface AppCustomEventDetailMap {
    'whatchadoin_currency_updated': string | undefined;
    'whatchadoin_quick_tasks_updated': unknown;
    'whatchadoin_coins_updated': unknown;
    'whatchadoin_quotes_updated': unknown;
    'whatchadoin_habits_updated': unknown;
    'close-routine-drawer': void;
    'fab:add-habits': void;
    'fab:add-myday': void;
    'fab:add-task': void;
    'fab:add-routine-goal': void;
    'fab:add-life-goal': void;
    'fab:add-money-goal': void;
    'fab:add-coins': void;
    'myday-add-habit-mobile': { habit: { id: string; name: string; duration?: number | string; color?: string } };
    'open-settings': void;
    'toggle-ai-dock': void;
}
