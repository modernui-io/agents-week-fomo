It's Agents Week at Cloudflare. The week's not over yet, but there's already too much to keep up with. Zeke couldn't keep up, so he deployed me as his deepfake to give you the scoop. Let's cover the highlights.

Here's the thing about agents. Every traditional app serves many users from one server. Agents flip that. One user, one agent, one task. Scale that to millions of people and you need millions of simultaneous sessions. Containers can't do that. Not at a price anyone would pay. So Cloudflare built something different.

Project Think is the next version of the Agents SDK. Your agent can crash and recover. It can hibernate when idle and cost you nothing. It can spawn sub-agents and escalate from a lightweight isolate to a full container when it needs one. Ten thousand agents on containers means ten thousand always-on instances. On Durable Objects, maybe a hundred are active at any moment. That's the difference.

Sandboxes are now generally available to everyone. Your agent gets a real computer: terminal, code interpreter, live preview URLs, secure credential injection. Figma is already using them for Figma Make.

Durable Objects got Facets. That means every AI-generated app can have its own SQLite database, supervised by your code. If you're building a platform where users can vibe-code their own apps, each app gets its own isolated state.

Browser Run lets your agent control a headless browser with a live view. If the agent gets stuck on a login page, it hands off to a human, the human logs in, the agent picks back up. You get session recordings, direct CDP access, and support for up to 120 concurrent browser sessions.

Voice agents got a new SDK. Wrap any agent class with withVoice and it can hear and speak in real time over WebSocket. Built-in speech-to-text and text-to-speech providers, React hooks included.

The Cloudflare Email Service entered public beta. Agents can send and receive email natively from Workers. There's an onEmail hook in the Agents SDK, so your agent can receive a message, do hours of background work, and reply when it's done.

AI Search shipped as a retrieval primitive. Create search instances on the fly, upload documents, and query with hybrid semantic and keyword search. One binding, built-in storage and vector index, no external services needed.

The Registrar API is now in beta. Agents can search for available domains, check pricing, and register them programmatically. Three API calls, a few seconds. It's already wired into the Cloudflare MCP server.

Artifacts is a versioned filesystem that speaks Git. Create a repo per agent session, fork sessions, time-travel through state. Import from GitHub, clone with standard Git tools. It's built on Durable Objects and it's heading to public beta next month.

The AI platform unified seventy-plus models from twelve providers behind one API and one bill. The Replicate team is now fully merged into Cloudflare. You can bring your own model via Cog. And AI Gateway now buffers streaming responses, so if your agent crashes mid-stream, it can reconnect without re-paying for the inference.

Cloudflare built a custom inference engine in Rust and shipped prefill-decode disaggregation, speculative decoding, and cross-GPU KV-cache sharing. The result: large language models that are fast enough for real-time agent loops, running on Cloudflare's own GPU fleet.

There's a new unified CLI. Run npx cf to manage any Cloudflare product from your terminal. It's backed by a new TypeScript schema system that generates CLI commands, config, bindings, and docs from a single source. Plus a local explorer that lets you inspect your local dev state for KV, R2, D1, Durable Objects, and Workflows.

Managed OAuth lets you flip a switch and make any internal app behind Cloudflare Access agent-ready, no code changes. And Cloudflare Mesh wires up private networking between your devices, servers, agents, and Workers, so everything can talk to each other securely without a VPN.

That's twenty blog posts and it's only Thursday. One more day to go. I'm Zeke's deepfake. You stay classy, developers. And good luck keeping up.
