import React from "react";


export interface SearchSortBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sortByName?: boolean;
    setSortByName?: (sort: boolean) => void;
    isFilterActive?: boolean;
    onFilterClear?: () => void;
    placeholder?: string;
    children?: React.ReactNode;
}

export default function SearchSortBar({
                                          searchQuery,
                                          setSearchQuery,
                                          sortByName,
                                          setSortByName,
                                          isFilterActive,
                                          onFilterClear,
                                          placeholder = "Find by name...",
                                          children
                                      }: SearchSortBarProps) {
    const isActive = isFilterActive || sortByName;

    return (<div className="search-sort-bar-container" style={{display: 'flex', gap: '8px', marginBottom: '16px', flexShrink: 0, alignItems: 'center'}}>
        <div style={{flex: 1, position: 'relative'}}>
            <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                color: 'var(--text-secondary)'
            }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
            <input name="auto_field_36"
                   type="text"
                   placeholder={placeholder}
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{width: '100%', paddingLeft: '32px', fontSize: '13px'}}
            />
        </div>
        <button
            className={`secondary ${isActive ? 'sort-active-glow' : ''}`}
            onClick={() => {
                if (isFilterActive && onFilterClear) {
                    onFilterClear();
                } else if (setSortByName) {
                    setSortByName(!sortByName);
                }
            }}
            style={{
                padding: '8px 12px',
                background: isActive ? 'var(--accent)' : '',
                boxShadow: isActive ? '0 0 12px var(--accent)' : 'none',
                color: isActive ? '#000' : 'currentColor',
                borderColor: isActive ? 'var(--accent)' : '',
                height: '37px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}
            title={isFilterActive ? "Clear Filter" : "Sort by Name"}
        >
            {isFilterActive ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    <line x1="23" y1="13" x2="17" y2="19"></line>
                    <line x1="17" y1="13" x2="23" y2="19"></line>
                </svg>) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M7 12h10"></path>
                    <path d="M10 18h4"></path>
                </svg>)}
        </button>
        {children}
    </div>);
}
