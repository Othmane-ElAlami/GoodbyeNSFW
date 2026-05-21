# GoodbyeNSFW 🚫 (Edge Extension)

A pure client-side Microsoft Edge extension to analyze your subscribed subreddits and help you manage NSFW content. 

This tool runs entirely in your browser. It uses your active Reddit login to fetch your subscriptions and unsubscribe you from unwanted content. **No Node.js servers, no API keys, and no data leaves your computer.**

## ✨ Features

- **Zero Servers, Zero Tracking** — Runs entirely as a local Edge extension.
- **Smart Detection** — Identifies all NSFW subreddits using Reddit's internal data.
- **Batch Cleanup** — Review and unsubscribe from unwanted NSFW content in one click.
- **Beautiful UI** — Built with React and Tailwind CSS.

## 🚀 Getting Started

### 1. Installation & Build

Since this is a client-side extension, you'll need to build it locally first:

1. Clone the repository:
   ```bash
   git clone https://github.com/Othmane-ElAlami/GoodbyeNSFW.git
   cd GoodbyeNSFW
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   *This will generate a `dist` folder containing the extension files.*

### 2. Load the Extension in Edge

1. Open Microsoft Edge and navigate to `edge://extensions/`.
2. Toggle **Developer mode** ON (usually in the bottom left or top right).
3. Click **"Load unpacked"**.
4. Select the newly generated `dist` folder inside your cloned project directory.

### 3. Use the Tool

1. Log into your Reddit account normally in Microsoft Edge.
2. Click the **GoodbyeNSFW** extension icon in your browser toolbar.
3. This will open the tool in a new tab.
4. Click **Scan My Subreddits** to begin the cleanup process!

## 🛠 Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Framer Motion
- **Build Tool:** Vite 6
- **Architecture:** Manifest V3 Browser Extension

## 💻 Development

If you want to modify the code:

```bash
# Install dependencies
npm install

# After making changes to the React code, rebuild the extension
npm run build
```

Then go back to `edge://extensions/` and click the refresh icon on the GoodbyeNSFW extension card to load your changes.
