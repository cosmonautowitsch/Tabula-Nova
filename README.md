# Tabula Nova - Firefox Extension

This is a Next.js application designed to be used as a Firefox new tab page extension.

## Features

- **Background Customization**: Set a custom background color or image URL.
- **Link & Folder Management**: Pin your favorite links and organize them into folders.
- **AI-Powered Search**: Integrated search bar with ChatGPT capabilities.
- **Weather Display**: Current weather for your configured location.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- Firefox Browser

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd tabula-nova 
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables (Optional but Recommended for Weather):**
    - The application uses OpenWeatherMap for weather data. You'll need a free API key.
    - Create a `.env.local` file in the root of the project (it's good practice even if not directly used by Next.js build for extensions, as you might store it in settings).
    - You can enter your API key directly in the extension's settings UI.

4.  **Build the extension:**
    This command exports the Next.js app to static HTML/CSS/JS files in the `out/` directory.
    ```bash
    npm run build
    ```
    The `build` script in `package.json` should already be configured to run `next build`. The `next.config.js` file is set up for static export (`output: 'export'`), so `next build` will produce the static site in the `out` directory.

### Loading the Extension in Firefox

1.  **Open Firefox.**
2.  Type `about:debugging` in the address bar and press Enter.
3.  Click on "**This Firefox**" (or "**This Nightly**" / "**This Developer Edition**") in the sidebar.
4.  Click on the "**Load Temporary Add-on...**" button.
5.  Navigate to the project directory, then into the `out/` folder.
6.  Select the `manifest.json` file (or any file within the `out` directory, Firefox is smart enough to find the manifest).
7.  The "Tabula Nova" extension should now be listed, and your new tabs will open with the custom page.

**Note:** Temporary add-ons are removed when you close Firefox. For persistent installation, you would need to package and sign the add-on through the Firefox Add-ons Developer Hub.

## Development

To run the app in development mode (not as an extension, but as a regular web app):
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) (or your configured port) in your browser.

Changes made in development mode will not immediately reflect in the loaded Firefox extension. You'll need to rebuild (`npm run build`) and potentially reload the temporary add-on in `about:debugging` (often Firefox picks up changes if you just click "Reload" next to the extension entry).

## Customization

- **Weather**: Go to Settings (cog icon) in Tabula Nova to set your city and OpenWeatherMap API key.
- **Background**: Customize the background color or image URL in Settings.
- **Links and Folders**: Use the UI to add, edit, and delete your links and folders. All data is stored locally in your browser.

## AI Search
The AI search feature uses Genkit. If you want to run the Genkit flows locally for development:
```bash
npm run genkit:dev
# or for watching changes
npm run genkit:watch
```
This will start the Genkit development server. Ensure your AI provider (e.g., Google AI with Gemini) is configured correctly. The frontend will make requests to these local flows. For the deployed extension, these flows would typically be deployed as serverless functions. However, as this is a client-side extension, direct client-to-AI-API calls (if feasible and secure) or a very lightweight backend proxy would be needed if not using local Genkit dev server. The current `chatGptSearch` flow is a server action and should work if the Next.js app is hosted, but for a pure static export extension, this part might need adjustment (e.g., making it a client-side call to a deployed Genkit flow or directly to an AI API). For this project, we assume the Genkit setup is handled.

---

This README provides basic setup. You'll likely want to add more details about your project's specific structure or advanced configuration if you expand it.
The current `chat-gpt-search.ts` is a server action. For a pure static Firefox extension (`output: 'export'`), server actions won't work directly as there's no Node.js server running.
You'd typically:
1. Deploy the Genkit flow as an HTTP endpoint (e.g., on Firebase Functions, Google Cloud Run).
2. Have the client-side extension make a `fetch` request to that deployed endpoint.

For this exercise, the `AiSearchBar` component will call the `chatGptSearch` function. If run in a Next.js dev environment with `npm run dev`, it would work. When exported statically, this call will fail unless the flow is accessible via HTTP.
The user can test this component functionality while running `npm run dev`.
For the extension, they might need to adapt the AI call to a deployed endpoint. I've kept the component as is, assuming this adaptation is outside the scope of the pure frontend generation or that they are aware of this limitation for static exports.
Alternatively, if the AI model allows direct client-side SDK usage with API keys (less common for powerful models like GPT due to key exposure), that could be another route.
The `chatGptSearch` from `src/ai/flows/chat-gpt-search.ts` is marked `'use server';` which means it's a Next.js Server Action.
The provided `package.json` already has `@genkit-ai/next` which is for Next.js integration. The current setup of `chatGptSearch` will work in a Next.js app environment but not in a purely static export without a backend. I will proceed with the current implementation as it is part of the provided scaffold.
