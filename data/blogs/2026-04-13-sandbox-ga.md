---
title: "Agents have their own computers with Sandboxes GA"
date: 2026-04-13
url: https://blog.cloudflare.com/sandbox-ga/
authors: ["Kate Reznykova", "Mike Nomitch", "Naresh Ramesh", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Agents have their own computers with Sandboxes GA

By Kate Reznykova, Mike Nomitch, Naresh Ramesh, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-13


# Agents have their own computers with Sandboxes GA

2026-04-13

- [![Kate Reznykova](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/UyzQXRgNN4kocaxlgOAEt/5b02b23b07329945606ccfae8db018e8/Kate_Reznykova.jpg)

](/author/kate-reznykova/)[Kate Reznykova](/author/kate-reznykova/)
- [![Mike Nomitch](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3Ub221L51x1p3FZJbnblyn/23b50473b99404db0baf42921edd269c/_tmp_mini_magick20240415-2-6izqhi.jpg)

](/author/mike-nomitch/)[Mike Nomitch](/author/mike-nomitch/)
- [![Naresh Ramesh](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/8fWzDeNfmjRWd7RiHmm9F/e2df08f65beff1959d6502b409b32a83/c9e4f698-da82-4304-9df5-2a4b1d0bd321_800x800.png)

](/author/naresh-ramesh/)[Naresh Ramesh](/author/naresh-ramesh/)

6 min readThis post is also available in [简体中文](/zh-cn/sandbox-ga), [Français](/fr-fr/sandbox-ga), [Deutsch](/de-de/sandbox-ga), [日本語](/ja-jp/sandbox-ga), [한국어](/ko-kr/sandbox-ga), [Español (Latinoamérica)](/es-la/sandbox-ga), [Español](/es-es/sandbox-ga) and [繁體中文](/zh-tw/sandbox-ga).![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/QxQLnc8Ysak3MyDb9orcq/9c3cb7cb9878f990da2be844fe8464ae/BLOG-3264_1.png)

When we launched [Cloudflare Sandboxes](https://github.com/cloudflare/sandbox-sdk) last June, the premise was simple: [AI agents](https://www.cloudflare.com/learning/ai/what-is-agentic-ai/) need to develop and run code, and they need to do it somewhere safe.

If an agent is acting like a developer, this means cloning repositories, building code in many languages, running development servers, etc. To do these things effectively, they will often need a full computer (and if they don’t, they can [reach for something lightweight](https://blog.cloudflare.com/dynamic-workers/)!).

Many developers are stitching together solutions using VMs or existing container solutions, but there are lots of hard problems to solve:

- **Burstiness -** With each session needing its own sandbox, you often need to spin up many sandboxes quickly, but you don’t want to pay for idle compute on standby.
- **Quick state restoration** - Each session should start quickly and re-start quickly, resuming past state.
- **Security** - Agents need to access services securely, but can’t be trusted with credentials.
- **Control** - It needs to be simple to programmatically control sandbox lifecycle, execute commands, handle files, and more.
- **Ergonomics** - You need to give a simple interface for both humans and agents to do common operations.

We’ve spent time solving these issues so you don’t have to. Since our initial launch we’ve made Sandboxes an even better place to run agents at scale. We’ve worked with our initial partners such as Figma, who run agents in containers with [Figma Make](https://www.figma.com/make/):

> *“Figma Make is built to help builders and makers of all backgrounds go from idea to production, faster. To deliver on that goal, we needed an infrastructure solution that could provide reliable, highly-scalable sandboxes where we could run untrusted agent- and user-authored code. Cloudflare Containers is that solution.”*
> 
> *- ****Alex Mullans****, AI and Developer Platforms at Figma*

We want to bring Sandboxes to even more great organizations, so today we are excited to announce that **Sandboxes and Cloudflare Containers are both generally available.**

Let’s take a look at some of the recent changes to Sandboxes:

- **Secure credential injection **lets you make authenticated calls without the agent ever having credential access
- **PTY support** gives you and your agent a real terminal
- **Persistent code interpreters** give your agent a place to execute stateful Python, JavaScript, and TypeScript out of the box
- **Background processes and live preview URLs** provide a simple way to interact with development servers and verify in-flight changes
- **Filesystem watching** improves iteration speed as agents make changes
- **Snapshots** let you quickly recover an agent's coding session
- **Higher limits and Active CPU Pricing** let you deploy a fleet of agents at scale without paying for unused CPU cycles


    
      
## Sandboxes 101


      [
        
      ](#sandboxes-101)
    
    Before getting into some of the recent changes, let’s quickly look at the basics.

A Cloudflare Sandbox is a persistent, isolated environment powered by [Cloudflare Containers](https://blog.cloudflare.com/containers-are-available-in-public-beta-for-simple-global-and-programmable/). You ask for a sandbox by name. If it's running, you get it. If it's not, it starts. When it's idle, it sleeps automatically and wakes when it receives a request. It’s easy to programmatically interact with the sandbox using methods like `exec`, `gitClone`, `writeFile` and [more](https://developers.cloudflare.com/sandbox/api/).


            
```Typescript
import { getSandbox } from "@cloudflare/sandbox";
export { Sandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env) {
    // Ask for a sandbox by name. It starts on demand.
    const sandbox = getSandbox(env.Sandbox, "agent-session-47");

    // Clone a repository into it.
    await sandbox.gitCheckout("https://github.com/org/repo", {
      targetDir: "/workspace",
      depth: 1,
    });

    // Run the test suite. Stream output back in real time.
    return sandbox.exec("npm", ["test"], { stream: true });
  },
};

```


            As long as you provide the same ID, subsequent requests can get to this same sandbox from anywhere in the world.


    
      
## Secure credential injection


      [
        
      ](#secure-credential-injection)
    
    One of the hardest problems in agentic workloads is authentication. You often need agents to access private services, but you can't fully trust them with raw credentials. 

Sandboxes solve this by injecting credentials at the network layer using a programmable egress proxy. This means that sandbox agents never have access to credentials and you can fully customize auth logic as you see fit:


            
```javascript
class OpenCodeInABox extends Sandbox {
  static outboundByHost = {
    "my-internal-vcs.dev": (request, env, ctx) => {
      const headersWithAuth = new Headers(request.headers);
      headersWithAuth.set("x-auth-token", env.SECRET);
      return fetch(request, { headers: headersWithAuth });
    }
  }
}

```


            For a deep dive into how this works — including identity-aware credential injection, dynamically modifying rules, and integrating with [Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/) — read our recent blog post on [Sandbox auth](https://blog.cloudflare.com/sandbox-auth).


    
      
## A real terminal, not a simulation


      [
        
      ](#a-real-terminal-not-a-simulation)
    
    Early agent systems often modeled shell access as a request-response loop: run a command, wait for output, stuff the transcript back into the prompt, repeat. It works, but it is not how developers actually use a terminal. 

Humans run something, watch output stream in, interrupt it, reconnect later, and keep going. Agents benefit from that same feedback loop.

In February, we shipped PTY support. A pseudo-terminal session in a Sandbox, proxied over WebSocket, compatible with [xterm.js](https://xtermjs.org/).

Just call `sandbox.terminal` to serve the backend:


            
```Typescript
// Worker: upgrade a WebSocket connection into a live terminal session
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/terminal") {
      const sandbox = getSandbox(env.Sandbox, "my-session");
      return sandbox.terminal(request, { cols: 80, rows: 24 });
    }
    return new Response("Not found", { status: 404 });
  },
};


```


            And use `xterm addon` to call it from the client:


            
```Typescript
// Browser: connect xterm.js to the sandbox shell
import { Terminal } from "xterm";
import { SandboxAddon } from "@cloudflare/sandbox/xterm";

const term = new Terminal();
const addon = new SandboxAddon({
  getWebSocketUrl: ({ origin }) => `${origin}/terminal`,
});

term.loadAddon(addon);
term.open(document.getElementById("terminal-container")!);
addon.connect({ sandboxId: "my-session" });

```


            This allows agents and developers to use a full PTY to debug those sessions live.


          ![BLOG-3264 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3bgyxh8kg3MPfij2v1XXLE/9cff50318ad306b20c3346c3bd3554d9/BLOG-3264_2.gif)

Each terminal session gets its own isolated shell, its own working directory, its own environment. Open as many as you need, just like you would on your own machine. Output is buffered server-side, so reconnecting replays what you missed.


    
      
## A code interpreter that remembers


      [
        
      ](#a-code-interpreter-that-remembers)
    
    For data analysis, scripting, and exploratory workflows, we also ship a higher-level abstraction: a persistent code execution context.

The key word is “persistent.” Many code interpreter implementations run each snippet in isolation, so state disappears between calls. You can't set a variable in one step and read it in the next.

Sandboxes allow you to create “contexts” that persist state. Variables and imports persist across calls the same way they would in a Jupyter notebook:


            
```Typescript
// Create a Python context. State persists for its lifetime.
const ctx = await sandbox.createCodeContext({ language: "python" });

// First execution: load data
await sandbox.runCode(`
  import pandas as pd
  df = pd.read_csv('/workspace/sales.csv')
  df['margin'] = (df['revenue'] - df['cost']) / df['revenue']
`, { context: ctx });

// Second execution: df is still there
const result = await sandbox.runCode(`
  df.groupby('region')['margin'].mean().sort_values(ascending=False)
`, { context: ctx, onStdout: (line) => console.log(line.text) });

// result contains matplotlib charts, structured json output, and Pandas tables in HTML

```


            
    
      
## Start a server. Get a URL. Ship it.


      [
        
      ](#start-a-server-get-a-url-ship-it)
    
    Agents are more useful when they can build something and show it to the user immediately. Sandboxes support background processes, readiness checks, and [preview URLs](https://developers.cloudflare.com/sandbox/concepts/preview-urls/). This lets an agent start a development server and share a live link without leaving the conversation.


            
```Typescript
// Start a dev server as a background process
const server = await sandbox.startProcess("npm run dev", {
  cwd: "/workspace",
});

// Wait until the server is actually ready — don't just sleep and hope
await server.waitForLog(/Local:.*localhost:(\d+)/);

// Expose the running service with a public URL
const { url } = await sandbox.exposePort(3000);

// url is a live public URL the agent can share with the user
console.log(`Preview: ${url}`);

```


            With `waitForPort()` and `waitForLog()`, agents can sequence work based on real signals from the running program instead of guesswork. This is much nicer than a common alternative, which is usually some version of `sleep(2000)` followed by hope.


    
      
## Watch the file system and react immediately


      [
        
      ](#watch-the-file-system-and-react-immediately)
    
    Modern development loops are event-driven. Save a file, rerun the build. Edit a config, restart the server. Change a test, rerun the suite.

We shipped *sandbox.watch()* in March. It returns an SSE stream backed by native [inotify](https://man7.org/linux/man-pages/man7/inotify.7.html), the kernel mechanism Linux uses for filesystem events.


            
```Typescript
import { parseSSEStream, type FileWatchSSEEvent } from '@cloudflare/sandbox';

const stream = await sandbox.watch('/workspace/src', {
  recursive: true,
  include: ['*.ts', '*.tsx']
});

for await (const event of parseSSEStream<FileWatchSSEEvent>(stream)) {
  if (event.type === 'modify' && event.path.endsWith('.ts')) {
    await sandbox.exec('npx tsc --noEmit', { cwd: '/workspace' });
  }
}

```


            This is one of those primitives that quietly changes what agents can do. An agent that can observe the filesystem in real time can participate in the same feedback loops as a human developer.


    
      
## Waking up quickly with snapshots


      [
        
      ](#waking-up-quickly-with-snapshots)
    
    Imagine a (human) developer working on their laptop. They `git clone` a repo, run `npm install`, write code, push a PR, then close their laptop while waiting for code review. When it’s time to resume work, they just re-open the laptop and continue where they left off.

If an agent wants to replicate this workflow on a naive container platform, you run into a snag. How do you resume where you left off quickly? You could keep a sandbox running, but then you pay for idle compute. You could start fresh from the container image, but then you have to wait for a long `git clone` and `npm install`.

Our answer is snapshots, which will be rolling out in the coming weeks.

A snapshot preserves a container's full disk state, OS config, installed dependencies, modified files, data files and more. Then it lets you quickly restore it later.

You can configure a Sandbox to automatically snapshot when it goes to sleep.


            
```javascript
class AgentDevEnvironment extends Sandbox {
  sleepAfter = "5m";
  persistAcrossSessions = {type: "disk"}; // you can also specify individual directories
}

```


            You can also programmatically take a snapshot and manually restore it. This is useful for checkpointing work or forking sessions. For instance, if you wanted to run four instances of an agent in parallel, you could easily boot four sandboxes from the same state.


            
```javascript
class AgentDevEnvironment extends Sandbox {}

async forkDevEnvironment(baseId, numberOfForks) {
  const baseInstance = await getSandbox(baseId);
  const snapshotId = await baseInstance.snapshot();

  const forks = Array.from({ length: numberOfForks }, async (_, i) => {
    const newInstance = await getSandbox(`${baseId}-fork-${i}`);
    return newInstance.start({ snapshot: snapshotId });
  });

  await Promise.all(forks);
}

```


            Snapshots are stored in [R2](https://developers.cloudflare.com/r2/) within your account, giving you durability and location-independence. R2's [tiered caching](https://developers.cloudflare.com/cache/how-to/tiered-cache/) system allows for fast restores across all of Region: Earth.

In future releases, live memory state will also be captured, allowing running processes to resume exactly where they left off. A terminal and an editor will reopen in the exact state they were in when last closed.

If you are interested in restoring session state before snapshots go live, you can use the [`backup and restore`](https://developers.cloudflare.com/sandbox/guides/backup-restore/) methods today. These also persist and restore directories using R2, but are not as performant as true VM-level snapshots. Though they still can lead to considerable speed improvements over naively recreating session state.


          ![BLOG-3264 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/LzVucBiNvxOh3NFn0ukxj/3b8e6cd9a5ca241b6c6a7c8556c0a529/BLOG-3264_3.gif)

*Booting a sandbox, cloning  ‘axios’, and npm installing takes 30 seconds. Restoring from a backup takes two seconds.*

Stay tuned for the official snapshot release.


    
      
## Higher limits and Active CPU Pricing


      [
        
      ](#higher-limits-and-active-cpu-pricing)
    
    Since our initial launch, we’ve been steadily increasing capacity. Users on our standard pricing plan can now run 15,000 concurrent instances of the lite instance type, 6,000 instances of basic, and over 1,000 concurrent larger instances. [Reach out](https://forms.gle/3vvDvXPECjy6F8v56) to run even more!

We also changed our pricing model to be more cost effective running at scale. Sandboxes now [only charge for actively used CPU cycles](https://developers.cloudflare.com/changelog/post/2025-11-21-new-cpu-pricing/). This means that you aren’t paying for idle CPU while your agent is waiting for an LLM to respond.


    
      
## This is what a computer looks like


      [
        
      ](#this-is-what-a-computer-looks-like)
    
    Nine months ago, we shipped a sandbox that could run commands and access a filesystem. That was enough to prove the concept.

What we have now is different in kind. A Sandbox today is a full development environment: a terminal you can connect a browser to, a code interpreter with persistent state, background processes with live preview URLs, a filesystem that emits change events in real time, egress proxies for secure credential injection, and a snapshot mechanism that makes warm starts nearly instant. 

When you build on this, a satisfying pattern emerges: agents that do real engineering work. Clone a repo, install it, run the tests, read the failures, edit the code, run the tests again. The kind of tight feedback loop that makes a human engineer effective — now the agent gets it too.

We're at version 0.8.9 of the SDK. You can get started today:

`npm i @cloudflare/sandbox@latest`


  


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Containers](/tag/containers/)[Sandbox](/tag/sandbox/)[Cloudflare Workers](/tag/workers/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)
