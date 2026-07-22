import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PrepSpace — The interview before the interview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social card on the cosmos cover canvas. Built with Satori-safe
// primitives only (flex divs, text, a simple stroked SVG, linear-gradient
// backgrounds — no filters/radial gradients).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(160deg, #0D042B 0%, #0B0620 55%, #0E1116 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 100 100">
            <path
              d="M68 8 C52 8, 38 18, 38 34 L38 46 L22 46 C18 46, 18 54, 22 54 L38 54 L38 82 C38 90, 44 96, 52 96"
              stroke="#63D88A"
              strokeWidth={10}
              strokeLinecap="round"
              fill="none"
            />
            <path d="M56 46 L72 46" stroke="#63D88A" strokeWidth={10} strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: -1,
              backgroundImage:
                "linear-gradient(180deg, #82E8A5 0%, #63D88A 55%, rgba(99,216,138,0.45) 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PrepSpace
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#FFFFFF",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: -2.5,
              maxWidth: 920,
            }}
          >
            The interview before the interview.
          </div>
          <div style={{ display: "flex", marginTop: 26, color: "#A6ADBB", fontSize: 30 }}>
            Live voice interview practice, indistinguishable from the real thing.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 40, height: 4, background: "#63D88A", borderRadius: 2 }} />
            <span style={{ display: "flex", color: "#63D88A", fontSize: 26, fontWeight: 600 }}>
              Built to get you hired.
            </span>
          </div>
          <span style={{ display: "flex", color: "#6E7480", fontSize: 24 }}>prepspace.example</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
