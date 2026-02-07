import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationResult {
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
}

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder = "Location (optional)" }: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchLocation = async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'tr,en',
                    }
                }
            );
            const data = await response.json();
            setResults(data);
            setShowDropdown(true);
        } catch (error) {
            console.error('Location search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setQuery(newValue);
        onChange(newValue);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            searchLocation(newValue);
        }, 300);
    };

    const handleSelect = (result: LocationResult) => {
        const shortName = result.display_name.split(',').slice(0, 3).join(',');
        setQuery(shortName);
        onChange(shortName);
        setShowDropdown(false);
        setResults([]);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        padding: '0.75rem',
                        paddingLeft: '2.25rem',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        boxSizing: 'border-box'
                    }}
                />
                <div style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MapPin size={16} />}
                </div>
            </div>

            {showDropdown && results.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '4px',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {results.map((result) => (
                        <div
                            key={result.place_id}
                            onClick={() => handleSelect(result)}
                            style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--accent)' }} />
                            <span style={{ color: 'var(--text-primary)' }}>
                                {result.display_name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
