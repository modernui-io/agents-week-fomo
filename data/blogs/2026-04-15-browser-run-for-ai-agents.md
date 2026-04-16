---
title: "Browser Run: give your agents a browser"
date: 2026-04-15
url: https://blog.cloudflare.com/browser-run-for-ai-agents/
authors: ["Kathy Liao", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Browser Run: give your agents a browser

By Kathy Liao, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-15


# Browser Run: give your agents a browser

2026-04-15

- [![Kathy Liao](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2XeJHmfHmhCUmRwC7aeCWR/fb2194fd1e4bed0667242d081354f5f2/kathy.png)

](/author/kathy/)[Kathy Liao](/author/kathy/)

8 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3MjIAL88ZhwvMpREBl4cqn/d62eb21ba79ba0ea11394994e676f2a9/image1.png)

AI agents need to interact with the web. To do that, they need a browser. They need to navigate sites, read pages, fill forms, extract data, and take screenshots. They need to observe whether things are working as expected, with a way for their humans to step in if needed. And they need to do all of this at scale.

Today, we’re renaming Browser Rendering to **Browser Run**, and shipping key features that make it *the* browser for [AI agents](https://www.cloudflare.com/learning/ai/what-is-agentic-ai/). The name Browser Rendering never fully captured what the product does. Browser Run lets you run full browser sessions on Cloudflare's global network, drive them with code or AI, record and replay sessions, crawl pages for content, debug in real time, and let humans intervene when your agent needs help. 

Here’s what’s new:

- **Live View**: see what your agent sees and is doing, in real time. Know instantly if things are working, and when they’re not, see exactly why.
- **Human in the Loop**: when your agent hits a snag like a login page or unexpected edge case, it can hand off to a human instead of failing. The human steps in, resolves, then hands back control.
- **Chrome DevTools Protocol (CDP) Endpoint**: the Chrome DevTools Protocol is how agents control browsers. Browser Run now exposes it directly, so agents get maximum control over the browser and existing CDP scripts work on Cloudflare.
- **MCP Client Support:** AI coding agents like Claude Desktop, Cursor, and OpenCode can now use Browser Run as their remote browser.
- **WebMCP Support**: agents will outnumber humans using the web. WebMCP allows websites to declare what actions are available for agents to discover and call, making navigation more reliable.
- **Session Recordings**: capture every browser session for debugging purposes. When something goes wrong, you have the full recording with DOM changes, user interactions, and page navigation.
- **Higher limits**: run more tasks at once with 120 concurrent browsers, up from 30.


  


*An AI agent searching Amazon for an orange lava lamp, comparing options, and handing off to a human when sign-in is required to complete the purchase*


    
      
## Everything an agent needs


      [
        
      ](#everything-an-agent-needs)
    
    Let’s think about what agents need when browsing the web and how each feature fits in:


| What an agent needs             | Browser Run (formerly Browser Rendering)                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1) Browsers on-demand           | Chrome browser on Cloudflare’s global network                                                                                                        |
| 2) A way to control the browser | Take actions like navigate, click, fill forms, screenshot, and more with Puppeteer, Playwright, CDP (new), MCP Client Support (new) and WebMCP (new) |
| 3) Observability                | Live View (new), Session Recordings (new), and Dashboard redesign (new)                                                                              |
| 4) Human intervention           | Human in the Loop (new)                                                                                                                              |
| 5) Scale                        | 10 requests/second for Quick Actions, 120 concurrent browsers (4x increase)                                                                          |


    
      
## 1) Open a browser


      [
        
      ](#1-open-a-browser)
    
    First, an agent needs a browser. With Browser Run, agents can spin up a headless Chrome instance on Cloudflare’s global network, on demand. No infrastructure to manage, no Chrome versions to maintain. Browser sessions open near users for low latency, and scale up and down as needed. Pair Browser Run with the [Agents SDK](https://developers.cloudflare.com/agents/api-reference/browse-the-web/) to build long-running agents that browse the web, remember everything, and act on their own. 


    
      
## 2) Take actions


      [
        
      ](#2-take-actions)
    
    Once your agent has a browser, it needs ways to control it. Browser Run supports multiple approaches: new low-level protocol access with the Chrome DevTools Protocol (CDP) and WebMCP, in addition to existing higher-level automation using [Puppeteer](https://developers.cloudflare.com/browser-rendering/puppeteer/) and [Playwright](https://developers.cloudflare.com/browser-rendering/playwright/), and [Quick Actions](https://developers.cloudflare.com/browser-rendering/rest-api/) for simple tasks. Let’s look at the details.


    
      
### Chrome DevTools Protocol (CDP) endpoint


      [
        
      ](#chrome-devtools-protocol-cdp-endpoint)
    
    The [Chrome DevTools Protocol (CDP)](https://chromedevtools.github.io/devtools-protocol/) is the low-level protocol that powers browser automation. Exposing CDP directly means the growing ecosystem of agent tools and existing CDP automation scripts can use Browser Run. When you open Chrome DevTools and inspect a page, CDP is what's running underneath. Puppeteer, Playwright, and most agent frameworks are built on top of it.

Every way that you have been using Browser Run has actually been through CDP already. What’s new is that we're now [exposing CDP directly](https://developers.cloudflare.com/browser-rendering/cdp/) as an endpoint. This matters for agents because CDP gives agents the most control possible over the browser. Agent frameworks already speak CDP natively, and can now connect to Browser Run directly. CDP also unlocks browser actions that aren't available through Puppeteer or Playwright, like JavaScript debugging. And because you're working with raw CDP messages instead of going through higher-level libraries, you can pass messages directly to models for more token-efficient browser control.

If you already have CDP automation scripts running against self-hosted Chrome, they work on Browser Run with a one-line config change. Point your WebSocket URL at Browser Run and stop managing your own browser infrastructure.


            
```javascript
// Before: connecting to self-hosted Chrome
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:9222/devtools/browser'
});

// After: connecting to Browser Run
const browser = await puppeteer.connect({
  browserWSEndpoint: 'wss://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/browser-rendering/devtools/browser',
  headers: { 'Authorization': 'Bearer <API_TOKEN>' }
});

```


            The CDP endpoint also makes Browser Run more accessible. You can now connect from any language, any environment, without needing to write a [Cloudflare Worker](https://developers.cloudflare.com/workers/). (If you're already using Workers, nothing changes.)


    
      
#### Using Browser Run with MCP Clients


      [
        
      ](#using-browser-run-with-mcp-clients)
    
    Now that Browser Run exposes the Chrome DevTools Protocol (CDP), MCP clients including Claude Desktop, Cursor, Codex, and OpenCode can use Browser Run as their remote browser. The [chrome-devtools-mcp package](https://github.com/ChromeDevTools/chrome-devtools-mcp) from the Chrome DevTools team is an MCP server that gives your AI coding assistant access to the full power of Chrome DevTools for reliable automation, in-depth debugging, and performance analysis.

Here’s an example of how to configure Browser Run for Claude Desktop:


            
```javascript
{
  "mcpServers": {
    "browser-rendering": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--wsEndpoint=wss://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/browser-rendering/devtools/browser?keep_alive=600000",
        "--wsHeaders={\"Authorization\":\"Bearer <API_TOKEN>\"}"
      ]
    }
  }
}

```


            For other MCP clients, see [documentation for using Browser Run with MCP clients](https://developers.cloudflare.com/browser-rendering/cdp/mcp-clients/).


    
      
### WebMCP support


      [
        
      ](#webmcp-support)
    
    The Internet was built for humans, so navigating as an AI agent today is unreliable. We’re betting on a future where more agents use the web than humans. In that world, sites need to be agent-friendly.

That’s why we’re launching support for [WebMCP](https://developer.chrome.com/blog/webmcp-epp), a new browser API from the Google Chrome team that landed in Chromium 146+. WebMCP lets websites expose tools directly to AI agents, declaring what actions are available for agents to discover and call on each page. This helps agents navigate the web more reliably. Instead of agents needing to figure out how to use a site, websites can expose their tools for agents to discover and call

Two APIs make this work:

- `navigator.modelContext` allows websites to register their tools
- `navigator.modelContextTesting` allows agents to discover and execute those tools

Today, an agent visiting a travel booking site has to figure out the UI by looking at it. With WebMCP, the site declares “here’s a search_flights tool that takes an origin, destination, and date.” The agent calls it directly, without having to loop through slow screenshot-analyze-click loops. This makes navigation more reliable regardless of potential changes to the UI.

Tools are discovered on the page rather than preloaded. This matters for the long tail of the web, where preloading an MCP server for every possible site is not feasible and would bloat the context window. 


  
*Using WebMCP to book a hotel through the Chrome DevTools console, discovering available tools with listTools()*

We have an experimental pool with browser instances running Chrome beta so you can test emerging browser features before they reach stable Chrome. We also just shipped [Wrangler browser commands](https://developers.cloudflare.com/browser-rendering/reference/wrangler-commands/) that let you manage browser sessions directly from the CLI, letting you create, manage, and view browser sessions directly from your terminal. To [access WebMCP-enabled browsers](https://developers.cloudflare.com/browser-run/features/webmcp/), use the following Wrangler command to create a session in the experimental pool:


            
```javascript
npm i -g wrangler@latest
wrangler browser create --lab --keepAlive 300  

```


            
    
      
### Existing ways to use Browser Run


      [
        
      ](#existing-ways-to-use-browser-run)
    
    While CDP and WebMCP are new, you could already use [Puppeteer](https://developers.cloudflare.com/browser-rendering/puppeteer/), [Playwright](https://developers.cloudflare.com/browser-rendering/playwright/), or [Stagehand](https://developers.cloudflare.com/browser-rendering/stagehand/) for full browser automation through Browser Run. And for simple tasks like [capturing screenshots](https://developers.cloudflare.com/browser-rendering/rest-api/screenshot-endpoint/), [generating PDFs](https://developers.cloudflare.com/browser-rendering/rest-api/pdf-endpoint/), and [extracting markdown](https://developers.cloudflare.com/browser-rendering/rest-api/markdown-endpoint/), there are the [Quick Action endpoints](https://developers.cloudflare.com/browser-rendering/rest-api/). 


    
      
#### /crawl endpoint — crawl web content


      [
        
      ](#crawl-endpoint-crawl-web-content)
    
    We also recently shipped a [/crawl endpoint](https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/) that lets you crawl entire sites with a single API call. Give it a starting URL and pages are automatically discovered and scraped, then returned in your preferred format (HTML, Markdown, and structured JSON), with additional parameters to control crawl depth and scope, skip pages that haven’t changed, and specify certain paths to include or exclude. 

We intentionally built /crawl to be a [well-behaved crawler](https://developers.cloudflare.com/browser-run/faq/#will-browser-run-be-detected-by-bot-management). That means it respects site owner’s preferences out of the box, is a [signed agent](https://developers.cloudflare.com/bots/concepts/bot/signed-agents/) with a distinct bot ID that is cryptographically signed using [Web Bot Auth](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/), a non-customizable [User-Agent](https://developers.cloudflare.com/browser-rendering/rest-api/crawl-endpoint/#user-agent), and follows robots.txt and [AI Crawl Control](https://www.cloudflare.com/ai-crawl-control/). It does not bypass Cloudflare’s bot protections or CAPTCHAs. Site owners choose whether their content is accessible and /crawl respects it. 


            
```javascript
# Initiate a crawl
curl -X POST 'https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/crawl' \
  -H 'Authorization: Bearer <apiToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://blog.cloudflare.com/"
  }'

```


            
    
      
## 3) Observe


      [
        
      ](#3-observe)
    
    Things don’t always go right the first try. We kept hearing from customers that when their automations failed, they had no idea why. That’s why we’ve added multiple ways to observe what’s happening, so you can see exactly what your agent sees, both live and after the fact. 


    
      
### Live View


      [
        
      ](#live-view)
    
    [Live View](https://developers.cloudflare.com/browser-run/features/live-view/) lets you watch your agent’s browser session in real time. Whether you’re debugging an agent or running a long automation script, you see exactly what’s happening as it happens. This includes the page itself, as well as the DOM, console, and network requests. When something goes wrong — the expected button isn't there, the page needs authentication, or a CAPTCHA appears — you can catch it immediately.

There are two ways to access Live View. From code, obtain the `session_id` of the browser you want to inspect and open the `devtoolsFrontendURL` from the response in Chrome. Or from the Cloudflare dashboard, open the new Live Sessions tab in the Browser Run section and click into any active session.


  
*Live View of an AI agent booking a hotel, showing real-time browser activity*


    
      
### Session Recordings


      [
        
      ](#session-recordings)
    
    Live View is great when you’re available, but you can’t watch every session. [Session Recordings](https://developers.cloudflare.com/browser-run/features/session-recording/) captures DOM changes, mouse and keyboard events, and page navigation as structured JSON so you can replay any session after it ends. 

Enable Session Recordings by passing `recording:true` when launching a browser. After the session closes, you can access the recording in the Cloudflare dashboard from the Runs tab or retrieve recordings via API and replay them with the [rrweb-player](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-player). Next, we’re adding the ability to inspect DOM state and console output at any point during the recording.   


  
*Session recording replay of a browser automation browsing the Sentry Shop and adding a bomber jacket to the cart *


    
      
### Dashboard Redesign


      [
        
      ](#dashboard-redesign)
    
    Previously, the [Browser Run dashboard](https://dash.cloudflare.com/?to=/:account/workers/browser-run) only showed logs from browser sessions. Requests for screenshots, PDFs, markdown, and crawls were not visible. The redesigned dashboard changes that. The new Runs tab shows every request. You can filter by endpoint and view details including target URLs, status, and duration.  


          ![Browser Run dashboard Runs tab with browser sessions and quick actions visible in one list, and an expanded crawl job showing running status and progress](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7eExar2kjoc2QSq6skzTf6/ba4ad79fa01eb060f8b14cd5afa342e5/BLOG-3221_2.png)

*The Browser Run dashboard Runs tab showing browser sessions and quick actions like PDF, Screenshot, and Crawl in a single view, with a crawl job expanded to show its progress*


    
      
## 4) Intervene


      [
        
      ](#4-intervene)
    
    Agents are good, but they’re not perfect. Sometimes they need their human to step in. Browser Run supports Human in the Loop workflows where a human can take control of a live browser session, handle what the automation cannot, then let the session continue. 


    
      
### Human in the Loop


      [
        
      ](#human-in-the-loop)
    
    When automation hits a wall, you don't have to restart. With [Human in the Loop](https://developers.cloudflare.com/browser-run/features/human-in-the-loop/), you can step in and interact with the page directly to click, type, navigate, enter credentials, or submit forms. This unlocks workflows that agents cannot handle.

Today, you can step in by opening the Live View URL for any active session. Next, we’re adding a handoff flow where the agent can signal that it needs help, notify a human to step in, then hand control back to the agent once the issue is resolved.


  


*An AI agent searching Amazon for an orange lava lamp, comparing options, and handing off to a human when sign-in is required to complete the purchase*


    
      
## 5) Scale


      [
        
      ](#5-scale)
    
    Customers have asked us to raise limits so that they can do more, faster.


    
      
### Higher limits


      [
        
      ](#higher-limits)
    
    We've quadrupled the [default concurrent browser limit from 30 to 120](https://developers.cloudflare.com/browser-rendering/limits/). Every session gives you instant access to a browser from a global pool of warm instances, so there's no cold start waiting for a browser to spin up. In March, we also [increased limits for Quick Actions](https://developers.cloudflare.com/changelog/post/2026-03-04-br-rest-api-limit-increase/) to 10 requests per second. If you need higher limits, they're available by request.


    
      
## What's next


      [
        
      ](#whats-next)
    
    - **Human in the Loop Handoff**: today you can intervene in a browser session through Live View. Soon, the agent will be able to signal when it needs help, so you can build in notifications to alert a human to step in.
- **Session Recordings Inspection**: you can already scrub through the timeline and replay any session. Soon, you’ll be able to inspect DOM state and console output as well.
- **Traces and Browser Logs**: access debugging information without instrumenting your code. Console logs, network requests, timing data. If something broke, you'll know where.
- **Screenshot, PDF, and markdown directly from Workers**: the same simple tasks available through the [REST API](https://developers.cloudflare.com/browser-rendering/rest-api/) are coming to [Workers Bindings](https://developers.cloudflare.com/browser-rendering/workers-bindings/). e`nv.BROWSER.screenshot()` just works, with no API tokens needed.


    
      
## Get started


      [
        
      ](#get-started)
    
    Browser Run is available today on both the Workers Free and Workers Paid plans. Everything we shipped today — Live View, Human in the Loop, Session Recordings, and higher concurrency limits — is ready to use. 

If you were already using Browser Rendering, everything works the same, just with a new name and more features.  

Check out the [documentation](https://developers.cloudflare.com/browser-rendering/) to get started. 


          ![BLOG-3221 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6mQq5rxfDK3oU80JCRUL7P/7842cac72f0f4170cc697011230146ab/BLOG-3221_3.png)


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Chrome](/tag/chrome/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)[AI](/tag/ai/)[Cloudflare Workers](/tag/workers/)[Browser Rendering](/tag/browser-rendering/)[Agents](/tag/agents/)[Browser Run](/tag/browser-run/)
