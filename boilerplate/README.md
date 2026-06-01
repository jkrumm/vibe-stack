# Your app

This is **your app**. You don't need to know how to code to change it.

## How you change it

You talk to Claude. Open the **Code tab**, type what you want in plain words, and Claude
does the work for you. That's it — describing what you want *is* how you build it.

You can speak German. Claude answers in German.

## Things you can say

- **"Add a field for the price."** — Claude adds a new piece of information you can fill in.
- **"Show a chart of the amounts over time."** — Claude builds the chart for you.
- **"Let me attach a photo to each entry."** — Claude adds photo upload.
- **"Change the title to 'My Meal Diary'."** — Claude renames things.
- **"Deploy."** (or "veröffentliche") — Claude publishes your changes so they're live on the web.
- **"Roll back."** (or "rückgängig") — Claude undoes the last publish if something went wrong.

If a request is unclear, Claude will ask you a short question first. If something breaks,
Claude explains it in one calm sentence — you never see scary technical errors.

## You never touch the files

You don't open, edit, or save any files yourself. Claude does all of that. Just describe
what you want.

There is one special file called **CLAUDE.md** — that's **Claude's memory** for your app.
It reminds Claude how your app works and the rules to follow. You don't need to read or
edit it; Claude keeps it up to date. Please don't change it by hand.

## How you (and others) use the finished app

To actually use your app, just open its **web address** in a browser. On a phone, open the
address and choose **"Add to Home Screen"** — now it sits next to your other apps and opens
like one.

## If you're curious (totally optional)

Under the hood your app is a few simple pieces, all running on Cloudflare:

- **One Worker** — this is both the **screen** you see and the **logic** behind it.
- **D1** — the **database**, where your entries and numbers are stored.
- **R2** — **file storage**, where your photos and uploads live.

You never have to think about any of this. Just talk to Claude in the Code tab.
