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
                        backgroundColor: '#060606',
                        fontFamily: 'sans-serif',
                        padding: '40px',
                        border: '2px solid rgba(0, 255, 255, 0.2)',
                    }}
                >
                    {/* Background Grid Pattern */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0, 255, 255, 0.05) 1px, transparent 0)',
                            backgroundSize: '24px 24px',
                        }}
                    />

                    {/* Card Content Row */}
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.4em', color: '#00ffff' }}>
                                MR. WORKOUT
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', color: 'rgba(255, 255, 255, 0.4)' }}>
                                THE CLINIC // PH1
                            </div>
                        </div>
                        
                        <div style={{ padding: '8px', backgroundColor: 'rgba(0, 255, 255, 0.1)', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '4px' }}>
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
                        }}
                    >
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ffff', letterSpacing: '0.4em', marginBottom: '8px', textTransform: 'uppercase' }}>
                            {name}
                        </div>
                        <div style={{ fontSize: '48px', fontWeight: '900', color: 'white', fontStyle: 'italic', letterSpacing: '-0.05em', display: 'flex' }}>
                          FOUNDING <span style={{ color: '#00ffff', marginLeft: '12px' }}>ATHLETE</span>
                        </div>
                        <div style={{ fontSize: '80px', fontWeight: '900', color: '#FFD700', marginTop: '-10px', textShadow: '0 0 20px rgba(255, 215, 0, 0.3)' }}>
                            #{founderId}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            paddingTop: '20px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.2em' }}>
                                ATHLETE IDENTIFIER
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                                {email}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)', letterSpacing: '0.2em' }}>
                                STATUS
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#00ffff' }}>
                                ELITE ACCESS GRANTED
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
