/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            "light",
            "dark",
            "retro",
            "night",
            {
                "angel-theme": {
                    "primary": "#FFD700", // Gold
                    "secondary": "#FFF8DC", // Cornsilk
                    "accent": "#F0E68C", // Khaki
                    "neutral": "#3D4451",
                    "base-100": "#FFFFF0", // Ivory
                    "info": "#3ABFF8",
                    "success": "#36D399",
                    "warning": "#FBBD23",
                    "error": "#F87272",
                },
                "evil-theme": {
                    "primary": "#FF0000", // Red
                    "secondary": "#8B0000", // Dark Red
                    "accent": "#555555", // Grey
                    "neutral": "#1a1a1a",
                    "base-100": "#000000", // Pure Black
                    "base-content": "#ffffff", // White text
                    "info": "#3ABFF8",
                    "success": "#36D399",
                    "warning": "#FBBD23",
                    "error": "#F87272",
                },
                "prophet-theme": {
                    "primary": "#90EE90", // Light Green
                    "secondary": "#556B2F", // Dark Olive Green
                    "accent": "#8FBC8F", // Dark Sea Green
                    "neutral": "#2F4F4F", // Dark Slate Gray
                    "base-100": "#354A21", // Mossy Green Background (Custom)
                    "base-content": "#F0FFF0", // Honeydew text
                    "info": "#3ABFF8",
                    "success": "#36D399",
                    "warning": "#FBBD23",
                    "error": "#F87272",
                },
                "disciple-theme": {
                    "primary": "#FFD700", // Gold (Faith)
                    "secondary": "#FFA07A", // Light Salmon
                    "accent": "#FF6347", // Tomato
                    "neutral": "#2a0a0a",
                    "base-100": "#800000", // Maroon
                    "base-content": "#FFD700", // Gold text
                    "info": "#3ABFF8",
                    "success": "#36D399",
                    "warning": "#FBBD23",
                    "error": "#F87272",
                }
            }
        ],
    },
}
