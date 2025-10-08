
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// This function now acts as an API route that generates an image
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    // Safely get parameters with fallbacks
    const displayName = searchParams.get('displayName') || 'Utilisateur';
    const avatarUrl = searchParams.get('avatarUrl');
    const level = parseInt(searchParams.get('level') || '0', 10);
    const rank = parseInt(searchParams.get('rank') || '0', 10);
    const xp = parseInt(searchParams.get('xp') || '0', 10);
    const requiredXp = parseInt(searchParams.get('requiredXp') || '100', 10);
    
    // Customization parameters
    const backgroundUrl = searchParams.get('backgroundUrl');
    const barColor = searchParams.get('barColor') || '#FFFFFF';
    const textColor = searchParams.get('textColor') || '#FFFFFF';
    
    const progress = requiredXp > 0 ? (xp / requiredXp) * 100 : 0;

    // Load fonts
    const interRegular = await fetch(new URL('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2')).then(res => res.arrayBuffer());
    const interBold = await fetch(new URL('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa7ZL7.woff2')).then(res => res.arrayBuffer());
    const interExtraBold = await fetch(new URL('https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2pL7.woff2')).then(res => res.arrayBuffer());

  return new ImageResponse(
    (
        <div style={{
            width: 900,
            height: 250,
            display: 'flex',
            fontFamily: '"Inter"',
            color: textColor,
            position: 'relative',
            overflow: 'hidden',
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
                display: 'flex',
            }}></div>
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 2,
                display: 'flex',
            }}></div>

            {/* Content */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '40px',
                gap: '24px',
                zIndex: 3,
                width: '100%',
            }}>
                {/* Avatar */}
                <div style={{
                    width: 150,
                    height: 150,
                    borderRadius: '9999px',
                    border: '4px solid #fff',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}>
                    {avatarUrl ? (
                         <img src={avatarUrl} alt={displayName} width="150" height="150" style={{ borderRadius: '9999px' }} />
                    ) : (
                        <div style={{ fontSize: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{displayName.charAt(0)}</div>
                    )}
                </div>
               
                {/* Info Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: '100%',
                    justifyContent: 'space-between',
                    width: 'calc(100% - 174px)'
                }}>
                    {/* Top part: Name and Rank/Level */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}>
                        <h1 style={{
                            fontSize: '36px',
                            fontWeight: 700,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 400
                        }}>{displayName}</h1>
                        <div style={{ display: 'flex', gap: '16px', textAlign: 'right' }}>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>Rang</p>
                                <p style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>#{rank}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase' }}>Niveau</p>
                                <p style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>{level}</p>
                            </div>
                        </div>
                    </div>
                    {/* Bottom part: Progress bar and XP */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flexGrow: 1 }}>
                            <div style={{ height: '20px', width: '100%', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barColor, borderRadius: '9999px' }}></div>
                            </div>
                        </div>
                        <p style={{
                            fontSize: '18px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                        }}>{xp.toLocaleString()} / {requiredXp.toLocaleString()} XP</p>
                    </div>
                </div>
            </div>
        </div>
    ),
    {
      width: 900,
      height: 250,
      fonts: [
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
        },
        {
          name: 'Inter',
          data: interBold,
          weight: 700,
        },
        {
          name: 'Inter',
          data: interExtraBold,
          weight: 800,
        },
      ],
    }
  );
}
