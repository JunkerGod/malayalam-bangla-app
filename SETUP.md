# Setup

One-time setup, in this order. Everything here is free. You only need a web
browser (a Windows PC is easiest for steps 1–5, but they also work on the iPhone).

## 1. GitHub: make a `main` branch

The repository started empty, so the first code arrived on a branch called
`claude/festive-franklin-yybyxx`. Make `main` the branch the app is published from:

1. Open https://github.com/JunkerGod/malayalam-bangla-app
2. Click the branch dropdown (top left of the file list, it shows the current branch name).
3. Type `main` in the box, then click **Create branch main from claude/festive-franklin-yybyxx**.
4. Go to **Settings** (top bar) → **General** → **Default branch** → click the ⇄ icon → choose `main` → **Update** → confirm.

From now on, new work arrives as a pull request into `main`. You publish it by
opening the pull request and clicking **Merge pull request** → **Confirm merge**.

## 2. Azure AI Speech: get a free text-to-speech key

Azure has natural voices for both languages: `ml-IN-SobhanaNeural` (Malayalam)
and `bn-BD-NabanitaNeural` (Bangladeshi Bangla), plus male voices for dialogues.
The free tier (F0) gives 500,000 characters a month. The whole course needs
roughly 150,000, once.

1. Go to https://portal.azure.com and sign in with a Microsoft account (create one if needed).
   - If it asks you to create a subscription, choose the free account. Azure asks for a card
     to verify your identity. The free F0 speech tier does not charge it; when the free
     quota runs out, requests are refused, not billed.
2. In the search bar at the top, type **Speech service** and open it (under Azure AI services).
3. Click **+ Create** and fill in:
   - **Subscription**: your subscription
   - **Resource group**: click *Create new*, name it `bhasha`
   - **Region**: `Australia East`
   - **Name**: anything unique, e.g. `bhasha-speech-kiran`
   - **Pricing tier**: **Free F0** (important)
4. Click **Review + create**, then **Create**. Wait for "Your deployment is complete", then **Go to resource**.
5. In the left menu, open **Keys and Endpoint** (under *Resource Management*).
   Copy **KEY 1** and the **Location/Region** (it will be `australiaeast`). Keep this tab open.

## 3. GitHub: store the key as a secret

The key is never put in the code or the app. Only the GitHub audio job can read it.

1. In the repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**. Name: `AZURE_SPEECH_KEY`. Secret: paste KEY 1. **Add secret**.
3. Click **New repository secret** again. Name: `AZURE_SPEECH_REGION`. Secret: `australiaeast`. **Add secret**.

## 4. GitHub: generate the audio

1. Click the **Actions** tab. If it asks, click **I understand my workflows, go ahead and enable them**.
2. In the left list, click **Generate audio**.
3. Click **Run workflow** (right side) → branch `main` → **Run workflow**.
4. After a minute it shows a green tick. It has committed the audio files to `main`
   (you'll see a commit "Add generated audio").
   - A red cross with "Azure rejected the key" means the key or region secret is wrong: redo step 3.

This job also runs by itself whenever course content changes, so you won't normally need to run it by hand.

## 5. Netlify: publish the app

1. Go to https://app.netlify.com and sign up / log in with **GitHub**.
2. Click **Add new project** → **Import an existing project** → **GitHub**. Authorize Netlify if asked.
3. Pick **malayalam-bangla-app**. If it isn't listed, click *Configure the Netlify app on GitHub*,
   give it access to that repository, and come back.
4. Check the settings. They are read from `netlify.toml`, so you shouldn't need to change anything:
   - Branch to deploy: `main`
   - Build command: `npm run validate && npm run build`
   - Publish directory: `dist`
5. Pick a project name (e.g. `kiran-bhasha`) and click **Deploy**. After about a minute
   the app is live at `https://kiran-bhasha.netlify.app` (your name instead).
   - You can rename later under **Project configuration** → **Change project name**.

About Netlify's free plan: it gives 300 credits a month and each publish of `main`
costs 15, so about 20 publishes a month. That's why work arrives as one pull request
per batch. Previews of pull requests are free.

## 6. iPhone: install the app

1. Open the Netlify address in **Safari** (it must be Safari).
2. Tap the **Share** button (square with an arrow), then **Add to Home Screen**.
   If you see an **Open as Web App** switch, leave it on. Tap **Add**.
3. Open the app from the home screen icon (not from Safari) from now on.

### Add the keyboards

Settings → General → Keyboard → Keyboards → **Add New Keyboard…** → add **Malayalam**,
then do the same for **Bangla**. Switch keyboards while typing with the 🌐 key
(or press and hold it to pick from a list).

## Later: Supabase (Phase 2)

Progress backup to Supabase arrives in Phase 2; setup steps will be added here then.
The app never depends on it: your progress lives on the phone, and Supabase is only a backup.
