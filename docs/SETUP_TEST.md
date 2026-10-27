# Run a setup test

Folio's first success goal is that **three people who have never seen it get a page live in under five minutes each.** The only way to know is to watch someone try. This takes about 20 minutes per person.

## Who to ask

Pick people who match who Folio is for, and who haven't seen it before:

- Someone who has never used GitHub (most important; recruit at least one)
- A creator or small-business owner who uses a link-in-bio page today
- A developer, to catch anything that's confusing for technical reasons

They need a laptop. Ask them to sign out of GitHub and Vercel first, or use a private browser window, so they go through sign-up like a real newcomer.

## What to say

Read this out, then stay quiet:

> "I'm testing a tool, not you, so anything that goes wrong is the tool's fault. Please say what you're thinking as you go, even small things like 'I'm not sure what this button does'. I won't help unless you're completely stuck, because I need to see where it's hard. Your goal: get your own link page online with your name and at least one of your real links."

Then send them the landing page link and start a timer.

## Watch for

Don't help. Note the time and what happened whenever they:

- **Pause** for more than about 10 seconds
- **Hesitate** before clicking ("is this the right button?")
- **Go back** or reread something
- **Leave Folio's pages** to search for something
- **Say** anything about being unsure, confused or annoyed
- **Give up**, or ask you for help (only step in after a minute of being stuck)

## Afterwards, ask

1. What was the hardest part?
2. Was there a moment you thought about giving up?
3. Was anything on your page not what you expected?
4. Would you use this instead of what you use now? Why or why not?
5. How would you describe Folio to a friend?

## Notes template

Copy this for each person:

|                             |                                                      |
| --------------------------- | ---------------------------------------------------- |
| **Person**                  | (first name, how technical, uses link-in-bio today?) |
| **Total time to live page** |                                                      |
| **Got stuck at**            | (step and what happened)                             |
| **Needed help with**        |                                                      |
| **Quotes**                  |                                                      |
| **Page looked right?**      |                                                      |

| Time | Step                         | What happened |
| ---- | ---------------------------- | ------------- |
| 0:00 | Landing page                 |               |
|      | Deploy to Vercel             |               |
|      | Sign-up / GitHub permissions |               |
|      | First page live              |               |
|      | Editing folio.config.yaml    |               |
|      | Uploading a photo            |               |
|      | Done                         |               |

## Then

Turn each problem into an issue with the **Setup feedback** label. Fix the ones that stopped someone first, then the ones that slowed people down. Run it again with someone new after the fixes: the goal is three clean runs in a row.
