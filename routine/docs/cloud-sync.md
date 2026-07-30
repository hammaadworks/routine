# Cloud Sync with GitHub Gists

The app supports a lightweight, seamless, and completely serverless cloud sync mechanism using **GitHub Gists**. This allows you to sync your data across your PC, phone, or any other device without needing a dedicated database like Supabase, or worrying about OAuth configurations.

## How it Works

Because standard web apps (running in mobile Safari/Chrome) cannot arbitrarily read or write to local files (like an iCloud Drive folder) without constant user prompting, this app mimics a seamless file-sync by using a GitHub Gist as the central "file".

### 1. The Proxy Architecture
The entire app state is stored in standard browser `localStorage`. To make syncing completely invisible to the user and the rest of the application, we hijack the native `localStorage.setItem` method at boot time.

Whenever any part of the application updates a goal, changes a plan, or switches a version, it calls `localStorage.setItem`. Our proxy intercepts this:
- It saves the data locally as usual.
- It resets a 5-second debounce timer.
- Once you stop making changes for 5 seconds, the app compiles your entire `localStorage` state into a single JSON object and pushes it to GitHub via a `PATCH` request.

### 2. Startup Pull
When the app loads (or when you first connect the sync), it fetches the target Gist file. If the remote JSON differs from your local state, it overwrites the local state and reloads the page.

## Setup Instructions

1. Go to [gist.github.com](https://gist.github.com) and create a new **Private** Gist.
2. Add a file to it. You can name it whatever you like (e.g., `habits_data.json`, `my_sync.json`). Just put `{}` as the content and save it.
3. Go to your [GitHub Developer Settings](https://github.com/settings/tokens) and generate a new **Personal Access Token (classic)**. Give it a descriptive name and check the `gist` permission scope.
4. In the Routine app, click the **Cloud Sync** icon in the top left pane.
5. Paste your Personal Access Token, your Gist ID (the long alphanumeric string at the end of your Gist's URL), and the exact Filename you used in step 2.
6. Click **Save & Sync**.

## Security and Privacy
- The data syncs directly from your browser to GitHub's API. There is no middleman server.
- The Gist is private (as long as you create it as a "Secret Gist").
- The sync credentials (Token and Gist ID) are stored *only* in your browser's local storage and are never pushed to the cloud.

## Technical Notes
- The sync module specifically ignores the keys `gist_token`, `gist_id`, and `gist_filename` when pushing data to ensure you don't leak your token inside the JSON payload.
- You can change the sync filename at any time in the settings modal. If you change it, the next sync will create or update that specific file inside the given Gist ID.
