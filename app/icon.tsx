import { ImageResponse } from "next/og";

export const size        = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    background:     "#060606",
                    width:          "100%",
                    height:         "100%",
                    display:        "flex",
                    flexDirection:  "column",
                    alignItems:     "center",
                    justifyContent: "center",
                    borderRadius:   "120px",
                }}
            >
                {/* Outer glow ring */}
                <div
                    style={{
                        position:     "absolute",
                        width:        "440px",
                        height:       "440px",
                        borderRadius: "50%",
                        border:       "3px solid rgba(0,229,204,0.25)",
                        boxShadow:    "0 0 80px rgba(0,229,204,0.3)",
                    }}
                />
                {/* Letters */}
                <div
                    style={{
                        display:        "flex",
                        flexDirection:  "column",
                        alignItems:     "center",
                        justifyContent: "center",
                        lineHeight:     1,
                    }}
                >
                    <span
                        style={{
                            fontSize:    "220px",
                            fontWeight:  900,
                            color:       "#00E5CC",
                            letterSpacing: "-0.05em",
                            fontFamily:  "sans-serif",
                            textShadow:  "0 0 80px rgba(0,229,204,0.7)",
                        }}
                    >
                        M
                    </span>
                    <span
                        style={{
                            fontSize:      "60px",
                            fontWeight:    700,
                            color:         "rgba(255,255,255,0.35)",
                            letterSpacing: "0.25em",
                            fontFamily:    "sans-serif",
                            marginTop:     "-20px",
                        }}
                    >
                        WORKOUT
                    </span>
                </div>
            </div>
        ),
        { ...size }
    );
}
