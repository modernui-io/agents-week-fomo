---
title: "Introducing Agent Lee - a new interface to the Cloudflare stack"
date: 2026-04-15
url: https://blog.cloudflare.com/introducing-agent-lee/
authors: ["Kylie Czajkowski", "Aparna Somaiah", "Brayden Wilmoth", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Introducing Agent Lee - a new interface to the Cloudflare stack

By Kylie Czajkowski, Aparna Somaiah, Brayden Wilmoth, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-15


# Introducing Agent Lee - a new interface to the Cloudflare stack

2026-04-15

- [![Kylie Czajkowski](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4Z9MHiw8nSQDGREFvywCWD/bfa27ec84d3e8b0138ac67e7fd5a2426/e19ce19a-109a-478f-82db-3ac9440a9bac_800x800.png)

](/author/kylie-czajkowski/)[Kylie Czajkowski](/author/kylie-czajkowski/)
- [![Aparna Somaiah](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5xVTMwPoRXKMyBwFYgzqHx/d68a767e9e050e3799f7d63345ae3e4f/dc9dc90d-60ab-48ee-81e4-6c3d745d1d3e_800x800.png)

](/author/aparna-somaiah/)[Aparna Somaiah](/author/aparna-somaiah/)
- [![Brayden Wilmoth](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2zY0YXlz7kiE7MbcPoqyy8/bb530238dcbf983352bb7d5943b2a620/eddfc8de-1418-4a5f-979e-1af00843950a_224x224.png)

](/author/brayden-wilmoth/)[Brayden Wilmoth](/author/brayden-wilmoth/)

7 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4iEamiPfjO0IPBEaF4Ufrl/d8d458558a7c304f95d01a5aed69dcf4/BLOG-3231_1.png)

While there have been small improvements along the way, the interface of technical products has not really changed since the dawn of the Internet. It still remains: clicking five pages deep, cross-referencing logs across tabs, and hunting for hidden toggles.

AI gives us the opportunity to rethink all that. Instead of complexity spread over a sprawling graphical user interface: what if you could describe in plain language what you wanted to achieve? 

This is the future — and we’re launching it today. We didn’t want to just put an agent in a dashboard. We wanted to create an entirely new way to interact with our entire platform. Any task, any surface, a single prompt.

Introducing Agent Lee.

Agent Lee is an in-dashboard AI assistant that understands **your** Cloudflare account. 

It can help you with troubleshooting, which, today, is a manual grind. If your Worker starts returning 503s at 02:00 UTC, finding the root cause: be it an R2 bucket, a misconfigured route, or a hidden rate limit, you’re opening half a dozen tabs and hoping you recognize the pattern. Most developers don't have a teammate who knows the entire platform standing over their shoulder at 2 a.m. Agent Lee does. 

But it won’t just troubleshoot for you at 2 a.m. Agent Lee will also fix the problem for you on the spot.


          ![BLOG-3231 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2Iva79HIiHPUrK8NLukkwH/dd1cf1709ab04f6d5825124cecd20a5e/BLOG-3231_2.png)

Agent Lee has been running in an active beta during which it has served over 18,000 daily users, executing nearly a quarter of a million tool calls per day. While we are confident in its current capabilities and success in production, this is a system we are continuously developing. As it remains in beta, you may encounter unexpected limitations or edge cases as we refine its performance. We encourage you to use the feedback form below to help us make it better every day.


    
      
## What Agent Lee can do


      [
        
      ](#what-agent-lee-can-do)
    
    Agent Lee is built directly into the dashboard and understands the resources in your account. It knows your Workers, your zones, your DNS configuration, your error rates. The knowledge that today lives across six tabs and two browser windows will now live in one place, and you can talk to it.

With natural language, you can use it to:

- **Answer questions about your account:** "Show me the top 5 error messages on my Worker."
- **Debug an issue:** "I can't access my site with the www prefix."
- **Apply a change:** "Enable Access for my domain."
- **Deploy a resource: **"Create a new R2 bucket for my photos and connect it to my Worker."

Instead of switching between products, you describe what you want to do, and Agent Lee helps you get there with instructions and visualizations. It retrieves context, uses the right tools, and creates dynamic visualizations based on the types of questions you ask. Ask what your error rate looks like over the last 24 hours, and it renders a chart inline, pulling from your actual traffic, not sending you to a separate Analytics page.


  
Agent Lee isn't answering FAQ questions — it's doing real work, against real accounts, at scale. Today, Agent Lee serves ~18,000 daily users, executing ~250k tool calls per day across DNS, Workers, SSL/TLS, R2, Registrar, Cache, Cloudflare Tunnel, API Shield, and more. 


    
      
## How we built it


      [
        
      ](#how-we-built-it)
    
    
    
      
### Codemode


      [
        
      ](#codemode)
    
    Rather than presenting MCP tool definitions directly to the model, Agent Lee uses [Codemode](https://blog.cloudflare.com/code-mode/) to convert the tools into a TypeScript API and asks the model to write code that calls it instead.

This works better for a couple of reasons. LLMs have seen a huge amount of real-world TypeScript but very few tool call examples, so they're more accurate when working in code. For multi-step tasks, the model can also chain calls together in a single script and return only the final result, ultimately skipping the round-trips.

The generated code is sent to an upstream Cloudflare MCP server for sandboxed execution, but it goes through a Durable Object that acts as a credentialed proxy. Before any call goes out, the DO classifies the generated code as read or write by inspecting the method and body. Read operations are proxied directly. Write operations are blocked until you explicitly approve them through the elicitation gate. API keys are never present in the generated code — they're held inside the DO and injected server-side when the upstream call is made. The security boundary isn't just a sandbox that gets thrown away; it's a permission architecture that structurally prevents writes from happening without your approval.


    
      
### The MCP permission system


      [
        
      ](#the-mcp-permission-system)
    
    Agent Lee connects to Cloudflare's own MCP server, which exposes two tools: a search tool for querying API endpoints and an execute tool for writing code that performs API requests. This is the surface through which Agent Lee reads your account and, when you approve, writes to it.

Write operations go through an elicitation system that surfaces the approval step before any code executes. Agent Lee cannot skip this step. The permission model is the enforcement layer, and the confirmation prompt you see is not a UX courtesy. It's the gate.


          ![BLOG-3231 4](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/s8phQottGj8yVgc42Nzvl/3abb536756e10360b68cabc0522bcb30/BLOG-3231_4.png)


    
      
## Built on the same stack you can use


      [
        
      ](#built-on-the-same-stack-you-can-use)
    
    Every primitive Agent Lee is built on is available to all our customers: [Agents SDK](https://developers.cloudflare.com/agents/), [Workers AI](https://www.cloudflare.com/developer-platform/products/workers-ai/), [Durable Objects](https://www.cloudflare.com/developer-platform/products/durable-objects/), and the same MCP infrastructure available to any Cloudflare developer. We didn't build internal tools that aren't available to you — instead we built it with the same Cloudflare lego blocks that you have access to.

Building Agent Lee on our own primitives wasn't just a design principle. It was the fastest way to find out what works and what doesn't. We built this in production, with real users, against real accounts. That means every limitation we hit is a limitation we can fix in the platform. Every pattern that works is one we can make easier for the next team that builds on top of it.

These are not opinions. They're what quarter of a million tool calls across 18,000 users a day are telling us.


          ![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6877BA4kZUUP6qTs5ONucr/50d572b38fecdb3e77ab38d7976f06ed/image5.png)


    
      
## Generative UI


      [
        
      ](#generative-ui)
    
    Interacting with a platform should feel like collaborating with an expert. Conversations should transcend simple text. With Agent Lee, as your dialogue evolves, the platform dynamically generates UI components alongside textual responses to provide a richer, more actionable experience.

For example, if you ask about website traffic trends for the month, you won’t just get a paragraph of numbers. Agent Lee will render an interactive line graph, allowing you to visualize peaks and troughs in activity at a glance.

To give you full creative control, every conversation is accompanied within an adaptive grid. Here you can click and drag across the grid to carve out space for new UI blocks, then simply describe what you want to see and let the agent handle the heavy lifting.

Today, we support a diverse library of visual blocks, including dynamic tables, interactive charts, architecture maps, and more. By blending the flexibility of natural language with the clarity of structured UI, Agent Lee transforms your chat history into a living dashboard.


          ![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1oTLXzK5eYGyJm6Y54cKbz/98bae92dc7523f63ac6515d8088e70f7/image4.png)


    
      
## Measuring quality and safety


      [
        
      ](#measuring-quality-and-safety)
    
    An agent that can take action on your account needs to be reliable and secure. Elicitations allow agentic systems to actively solicit information, preferences, or approvals from users or other systems mid-execution. When Agent Lee needs to take non-read actions on a user's behalf we use elicitations by requiring an explicit approval action in the user interface. These guardrails allow Agent Lee to truly be a partner alongside you in managing your resource safely.

In addition to safety, we continuously measure quality.

- Evals to measure conversation success rate and information accuracy.
- Feedback signals from user interactions (thumbs up / thumbs down).
- Tool call execution success rate and hallucination scorers.
- Per-product breakdown of conversation performance.

These systems help us improve Agent Lee over time while keeping users in control. 


    
      
## Our vision ahead


      [
        
      ](#our-vision-ahead)
    
    Agent Lee in the dashboard is only the beginning.

The bigger vision is Agent Lee as the interface to the entire Cloudflare platform — from anywhere. The dashboard today, the CLI next, your phone when you're on the go. The surface you use shouldn't matter. You should be able to describe what you need and have it done, regardless of where you are.

From there, Agent Lee gets proactive. Rather than waiting to be asked, it watches what matters to you, your Workers, your traffic, your error thresholds and reaches out when something warrants attention. An agent that only responds is useful. One that notices things first is something different.

Underlying all of this is context. Agent Lee already knows your account configuration. Over time, it will know more, what you've asked before, what page you're on, what you were debugging last week. That accumulated context is what makes a platform feel less like a tool and more like a collaborator.

We're not there yet. Agent Lee today is the first step, running in production, doing real work at scale. The architecture is built to get to the rest. 


    
      
## Try it out


      [
        
      ](#try-it-out)
    
    Agent Lee is available in beta for Free plan users. Log in to your [Cloudflare dashboard](https://dash.cloudflare.com/login) and click Ask AI in the upper right corner to get started.


          ![BLOG-3231 5](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4FThQbf24TcV1mYT49yi39/05df8347e14c8ef5e591d224a1a38393/Screenshot_2026-04-13_at_3.37.29%C3%A2__PM.png)

We'd love to know what you build and what you’d like to see in Agent Lee. Please share your feedback [here](https://forms.gle/dSCHNkHpJt6Uwsvc8).


          ![BLOG-3231 6](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/NsNVsMvU9v3U03jY4kU54/28182a4d9f36f75f8e93e5fcf67c1f21/BLOG-3231_6.png)


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Workers AI](/tag/workers-ai/)[SDK](/tag/sdk/)[Dashboard](/tag/dashboard-tag/)[Developers](/tag/developers/)[Developer Platform](/tag/developer-platform/)
