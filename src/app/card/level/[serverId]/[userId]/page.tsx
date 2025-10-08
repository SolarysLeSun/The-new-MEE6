import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface LevelCardPageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

// This is now a Server Component
export default function LevelCardPage({ searchParams }: LevelCardPageProps) {
    // Safely get parameters with fallbacks, now from searchParams prop
    const displayName = searchParams.displayName as string || 'Utilisateur';
    const avatarUrl = searchParams.avatarUrl as string | undefined;
    const level = parseInt(searchParams.level as string || '0', 10);
    const rank = parseInt(searchParams.rank as string || '0', 10);
    const xp = parseInt(searchParams.xp as string || '0', 10);
    const requiredXp = parseInt(searchParams.requiredXp as string || '100', 10);
    
    // Customization parameters
    const backgroundUrl = searchParams.backgroundUrl as string | undefined;
    const barColor = searchParams.barColor as string || '#FFFFFF';
    const textColor = searchParams.textColor as string || '#FFFFFF';
    
    const progress = requiredXp > 0 ? (xp / requiredXp) * 100 : 0;

    return (
        <div style={{
            width: 900,
            height: 250,
            display: 'flex',
            fontFamily: 'Inter, sans-serif',
            color: textColor,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '1rem',
        }}>
            {/* Background */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
                backgroundColor: backgroundUrl ? 'transparent' : '#23272A',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 1,
            }}></div>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 2,
            }}></div>

            {/* Content */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2.5rem',
                gap: '1.5rem',
                zIndex: 3,
                width: '100%',
            }}>
                {/* Avatar */}
                <div style={{
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    border: '4px solid #fff',
                    flexShrink: 0
                }}>
                     <Avatar style={{ width: '100%', height: '100%' }}>
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                        <AvatarFallback style={{ fontSize: '4rem' }}>{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
               
                {/* Info Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: '100%',
                    justifyContent: 'space-between'
                }}>
                    {/* Top part: Name and Rank/Level */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}>
                        <h1 style={{
                            fontSize: '2.25rem',
                            fontWeight: 700,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 400
                        }}>{displayName}</h1>
                        <div style={{ display: 'flex', gap: '1rem', textAlign: 'right' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>Rang</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>#{rank}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>Niveau</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{level}</p>
                            </div>
                        </div>
                    </div>
                    {/* Bottom part: Progress bar and XP */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flexGrow: 1 }}>
                            <div style={{ height: '1.25rem', width: '100%', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barColor, borderRadius: '9999px', transition: 'width 0.5s ease-in-out' }}></div>
                            </div>
                        </div>
                        <p style={{
                            fontSize: '1.125rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                        }}>{xp.toLocaleString()} / {requiredXp.toLocaleString()} XP</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
