import { ImageResponse } from "next/og";

export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    background:     "#060606",
                    width:          "100%",
                    height:         "100%",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    borderRadius:   "40px",
                }}
            >
                <span
                    style={{
                        fontSize:    "120px",
                        fontWeight:  900,
                        color:       "#00E5CC",
                        fontFamily:  "sans-serif",
                        textShadow:  "0 0 40px rgba(0,229,204,0.8)",
                        lineHeight:  1,
                    }}
                >
                    M
                </span>
            </div>
        ),
        { ...size }
    );
}
