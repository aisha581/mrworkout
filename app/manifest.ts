import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name:             "Mr. Workout",
        short_name:       "MrWorkout",
        description:      "Savage Fitness Tracking — Build muscle, track PRs, level up.",
        start_url:        "/",
        display:          "standalone",
        background_color: "#060606",
        theme_color:      "#00E5CC",
        orientation:      "portrait",
        categories:       ["health", "fitness", "lifestyle"],
        icons: [
            {
                src:     "/icon",
                sizes:   "any",
                type:    "image/png",
                purpose: "any",
            },
            {
                src:     "/apple-icon",
                sizes:   "180x180",
                type:    "image/png",
                purpose: "maskable",
            },
        ],
    };
}
