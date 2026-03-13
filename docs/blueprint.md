# **App Name**: Narros

## Core Features:

- Raw Content Upload & Ingestion: Enables users to paste or upload various content formats (text, PDF, audio) into the system for processing, utilizing Firebase Storage for efficient handling of raw files.
- AI Knowledge Structuring Engine: A generative AI tool that analyzes unstructured content (via Gemini 2.5 Flash on Vertex AI) to extract and organize knowledge into categories, operational playbooks, structured training agendas, and actionable insights, all within 30 seconds.
- Dynamic Knowledge Base Display: Presents the AI-generated structured knowledge, allowing users to browse categories, expand items, and review detailed information, stored in Firestore.
- AI Training Module Generation: Displays comprehensive training modules with estimated duration, objectives, topics, and suggested formats, automatically derived by AI and stored in Firestore.
- AI Operational Playbook Viewer: Allows users to view and interact with AI-generated operational playbooks, including step-by-step instructions for identified processes, persisted in Firestore.
- AI Knowledge Assistant Chat: Provides a chat interface where users can ask questions about their company's knowledge base, with the AI serving as an intelligent tool to retrieve relevant information from Firestore and Gemini 2.5 Flash.
- Workspace & User Management: Allows creation and management of separate workspaces for different business entities, including secure user authentication via Firebase Auth and access control stored in Firestore.

## Style Guidelines:

- Primary interactive color: Vibrant amber, #FFC850 (RGB: 255, 200, 80). This rich and energetic hue highlights interactive elements and calls to action, conveying clarity and modern professionalism against dark backgrounds.
- Background: Deep charcoal, #0A0A0A (RGB: 10, 10, 10). A foundational dark tone provides a clean, sophisticated, and immersive canvas, aligning with the app's focus on functional minimalism and allowing content to take center stage.
- Subtle focus accent: A translucent amber derived from the primary interactive color (rgba(255, 200, 80, 0.4)) used for border focus states, ensuring visual continuity and sleek feedback without overpowering the minimal aesthetic.
- Logo text font: 'Space Grotesk' for the 'Narros' brand name, combining modern geometry with classic proportions.
- Headline font: 'DM Serif Display' (serif), used for its elegant and assertive character, suitable for commanding titles and prominent headings. Note: currently only Google Fonts are supported.
- Body and UI font: 'DM Sans' (sans-serif), a versatile and highly readable font for general text, labels, and navigation elements, offering clarity and modern simplicity. Note: currently only Google Fonts are supported.
- Code and raw content font: 'JetBrains Mono' (monospace), dedicated for displaying raw content or code snippets, ensuring high readability for structured text. Note: currently only Google Fonts are supported.
- Exclusively utilize 'lucide-react' for all icons, providing a consistent, clean, and modern set of vector icons that visually support the app's functional design.
- Structural layout: Implement a persistent sidebar navigation on desktop (240px) which transforms into a bottom sheet on mobile (< 768px), paired with a dynamic main content area to ensure adaptable navigation.
- Content cards: Present information within well-defined cards featuring minimum 24px internal padding and 1px solid borders (#1e1e1e), opting for a flat, shadow-less aesthetic that emphasizes content hierarchy.
- Primary button style: Integrate a distinctive primary button with a subtle diagonal clip-path (polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))) and the primary amber color, providing a unique and engaging call to action.
- Interactive transitions: Apply 'transition: all 0.2s ease' to all interactive elements to ensure smooth and predictable visual feedback on hover and other interactions, contributing to a fluid user experience.
- Loading indicators: Utilize subtle, engaging loading animations such as pulsating amber dots ('<LoadingDots />') and rotating text to provide continuous and informative feedback during content processing, avoiding generic spinners.