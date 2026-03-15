import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';

export const runtime = 'edge';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email') || 'athlete@mrworkout.pro';
        const founderId = searchParams.get('id') || '001';
        const name = searchParams.get('name') || 'FOUNDING ATHLETE';

        // Generate QR Code data URL
        const qrCodeDataUrl = await QRCode.toDataURL('https://mrworkout.pro', {
            margin: 1,
            color: {
                dark: '#00ffff',
                light: '#000000',
            },
        });

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#0a0a0a',
                        fontFamily: 'sans-serif',
                        padding: '40px',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '8px solid #FFD700', // Gold Glowing Border
                        boxShadow: '0 0 50px rgba(255, 215, 0, 0.4)',
                    }}
                >
                    {/* Brushed Metal Background Effect */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
                            opacity: 0.9,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)',
                            backgroundSize: '100% 2px',
                        }}
                    />

                    {/* Card Content Row */}
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1, zIndex: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5em', color: '#FFD700' }}>
                                MR. WORKOUT
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', color: 'rgba(255, 255, 255, 0.4)' }}>
                                ELITE FOUNDER // PH1
                            </div>
                        </div>
                        
                        <div style={{ padding: '8px', backgroundColor: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '4px' }}>
                          <img src={qrCodeDataUrl} width="60" height="60" />
                        </div>
                    </div>

                    {/* Main Title */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            marginBottom: '40px',
                            zIndex: 10,
                        }}
                    >
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFD700', letterSpacing: '0.5em', marginBottom: '12px', textTransform: 'uppercase' }}>
                            {name}
                        </div>
                        <div style={{ fontSize: '44px', fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: '-0.05em', display: 'flex' }}>
                          FOUNDER <span style={{ color: '#FFD700', marginLeft: '12px' }}>STATUS</span>
                        </div>
                        <div style={{ fontSize: '90px', fontWeight: '900', color: 'white', marginTop: '-15px', textShadow: '0 0 30px rgba(255, 215, 0, 0.5)' }}>
                            #{founderId} <span style={{ fontSize: '24px', color: 'rgba(255, 215, 0, 0.5)', marginLeft: '10px' }}>/ 150</span>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            borderTop: '1px solid rgba(255, 215, 0, 0.2)',
                            paddingTop: '20px',
                            zIndex: 10,
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 215, 0, 0.4)', letterSpacing: '0.2em' }}>
                                ATHLETE CREDENTIALS
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                                {email}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 215, 0, 0.4)', letterSpacing: '0.2em' }}>
                                VERIFICATION
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFD700' }}>
                                STATUS: SECURED
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 500,
            }
        );
    } catch (e: any) {
        console.error(e);
        return new Response('Failed to generate image', { status: 500 });
    }
}
