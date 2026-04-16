import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name:             "Mr. Workout",
        short_name:       "MrWorkout",
        description:      "Savage Fitness Tracking — Build muscle, track PRs, level up.",
        start_url:        "/",
        scope:            "/",
        display:          "standalone",
        background_color: "#060606",
        theme_color:      "#00E5CC",
        orientation:      "portrait",
        categories:       ["health", "fitness", "lifestyle"],
        icons: [
            // Chrome requires explicit 192px + 512px for the install prompt
            {
                src:     "/icon",
                sizes:   "192x192",
                type:    "image/png",
                purpose: "any",
            },
            {
                src:     "/icon",
                sizes:   "512x512",
                type:    "image/png",
                purpose: "maskable",
            },
            // iOS home screen icon
            {
                src:     "/apple-icon",
                sizes:   "180x180",
                type:    "image/png",
            },
        ],
    };
}
