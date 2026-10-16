import React, { useState, useEffect } from 'react';
import { Globe, Trash2, Check } from 'lucide-react';
import BaseModal from '../BaseModal';
import type { PlatformConfig, PlatformType } from '../../types/dispatch';

interface ChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    personaName: string;
    personaId: string;
    channel: PlatformConfig | null; // null if creating a new channel
    defaultChromeProfile?: string;
    onSave: (personaId: string, channel: PlatformConfig) => void;
    onDelete?: (personaId: string, channelId: string) => void;
}

const PLATFORM_PRESETS: { type: PlatformType; label: string; defaultUrl: string; color: string }[] = [
    { type: 'x', label: 'X (Twitter)', defaultUrl: 'https://x.com/compose/post', color: '#FFFFFF' },
    { type: 'youtube', label: 'YouTube Shorts / Studio', defaultUrl: 'https://studio.youtube.com/', color: '#FF0000' },
    { type: 'instagram', label: 'Instagram', defaultUrl: 'https://www.instagram.com/', color: '#E1306C' },
    { type: 'linkedin', label: 'LinkedIn', defaultUrl: 'https://www.linkedin.com/feed/', color: '#0A66C2' },
    { type: 'facebook', label: 'Facebook Page', defaultUrl: 'https://www.facebook.com/', color: '#1877F2' },
    { type: 'threads', label: 'Threads', defaultUrl: 'https://www.threads.net/', color: '#EDE7D9' },
    { type: 'tiktok', label: 'TikTok', defaultUrl: 'https://www.tiktok.com/creator-center/upload', color: '#00F2FE' },
    { type: 'custom', label: 'Custom Channel', defaultUrl: 'https://', color: '#C9A227' }
];

export default function ChannelModal({
    isOpen,
    onClose,
    personaName,
    personaId,
    channel,
    defaultChromeProfile,
    onSave,
    onDelete
}: ChannelModalProps) {
    const [platformType, setPlatformType] = useState<PlatformType>('x');
    const [label, setLabel] = useState('');
    const [composeUrl, setComposeUrl] = useState('');
    const [chromeProfile, setChromeProfile] = useState('');
    const [color, setColor] = useState('#FFFFFF');

    useEffect(() => {
        if (channel) {
            setPlatformType(channel.platform);
            setLabel(channel.label);
            setComposeUrl(channel.composeUrl);
            setChromeProfile(channel.chromeProfile || '');
            setColor(channel.color || '#FFFFFF');
        } else {
            const preset = PLATFORM_PRESETS[0] || { type: 'x', label: 'X (Twitter)', defaultUrl: 'https://x.com/compose/post', color: '#FFFFFF' };
            setPlatformType(preset.type);
            setLabel(preset.label);
            setComposeUrl(preset.defaultUrl);
            setChromeProfile(defaultChromeProfile || 'Profile 1');
            setColor(preset.color);
        }
    }, [channel, isOpen, defaultChromeProfile]);

    if (!isOpen) return null;

    const handleSelectPlatformType = (type: PlatformType) => {
        setPlatformType(type);
        const preset = PLATFORM_PRESETS.find(p => p.type === type);
        if (preset) {
            // Auto fill label & url if label was default or empty
            if (!label || PLATFORM_PRESETS.some(p => p.label === label)) {
                setLabel(preset.label);
            }
            if (!composeUrl || PLATFORM_PRESETS.some(p => p.defaultUrl === composeUrl)) {
                setComposeUrl(preset.defaultUrl);
            }
            setColor(preset.color);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) return;

        const updatedConfig: PlatformConfig = {
            id: channel?.id || `plat_${platformType}_${Date.now()}`,
            platform: platformType,
            label: label.trim(),
            composeUrl: composeUrl.trim() || 'https://',
            chromeProfile: chromeProfile.trim() || defaultChromeProfile || 'Profile 1',
            color: color || '#FFFFFF',
            weeklySchedule: channel?.weeklySchedule || {}
        };

        onSave(personaId, updatedConfig);
        onClose();
    };

    const handleDelete = () => {
        if (!channel || !onDelete) return;
        if (window.confirm(`Are you sure you want to delete the channel "${channel.label}"?`)) {
            onDelete(personaId, channel.id);
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} color="var(--accent)" />
                    <span>{channel ? `Edit Channel (${personaName})` : `Add New Channel (${personaName})`}</span>
                </div>
            }
            maxWidth="480px"
        >
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Platform Preset Buttons */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Platform Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {PLATFORM_PRESETS.map(preset => {
                            const isSelected = platformType === preset.type;
                            return (
                                <button
                                    key={preset.type}
                                    type="button"
                                    onClick={() => handleSelectPlatformType(preset.type)}
                                    style={{
                                        padding: '7px 4px',
                                        borderRadius: '6px',
                                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                                        background: isSelected ? 'var(--block-bg)' : 'rgba(255, 255, 255, 0.02)',
                                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                        fontSize: '11.5px',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? '600' : 'normal',
                                        textAlign: 'center'
                                    }}
                                >
                                    {preset.type.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Channel Label */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Channel Label / Name
                    </label>
                    <input
                        type="text"
                        required
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="e.g. YouTube Shorts, Personal X Account"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Compose URL */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Compose / Direct URL
                    </label>
                    <input
                        type="url"
                        required
                        value={composeUrl}
                        onChange={e => setComposeUrl(e.target.value)}
                        placeholder="https://studio.youtube.com/ or https://x.com/compose/post"
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                        Clicking the channel opens this link directly in a new tab.
                    </span>
                </div>

                {/* Chrome Profile Override */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Chrome Profile Name
                    </label>
                    <input
                        type="text"
                        value={chromeProfile}
                        onChange={e => setChromeProfile(e.target.value)}
                        placeholder={defaultChromeProfile || 'Profile 1'}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                        e.g. `Profile 1`, `Profile 2`, or `Default` (matches your Chrome user profile).
                    </span>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    {channel && onDelete ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Trash2 size={14} />
                            <span>Delete Channel</span>
                        </button>
                    ) : <div />}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid var(--panel-border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid var(--accent)',
                                background: 'var(--block-bg)',
                                color: 'var(--accent)',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Check size={14} />
                            <span>Save Channel</span>
                        </button>
                    </div>
                </div>
            </form>
        </BaseModal>
    );
}
