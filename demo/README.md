# Demo recording

A real agent works the live page through WebMCP, on camera. Nothing is staged:
the agent discovers the tools with `document.modelContext.getTools()`, decides
what to call, and calls them with `executeTool()`. The founder's side of the
conversation is the four turns in `agent.mjs`; the founder's clicks between turns
are real DOM clicks.

```bash
# needs playwright on the module path (pnpm dlx playwright@1.62 install chrome, or a symlink), ffmpeg, and ANTHROPIC_API_KEY
node demo/agent.mjs                      # records demo/out/frames + transcript.json (about 3 minutes, live site)
DEMO_HOLD_CAP=4 DEMO_WALL_SECONDS=182 node demo/retime.mjs   # cap static holds while the model thinks
node demo/build-video.mjs                # 2560x1440 master from the frames, real time
node demo/mix-audio.mjs                  # narration from demo/narration over the beats
```

Narration lines are in `NARRATION.md`; the placeholder clips in `demo/narration`
were generated with the system voice and should be re-recorded before upload.
