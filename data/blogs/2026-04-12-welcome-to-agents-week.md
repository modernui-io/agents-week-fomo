---
title: "Welcome to Agents Week"
date: 2026-04-12
url: https://blog.cloudflare.com/welcome-to-agents-week/
authors: ["Rita Kozlov", "Dane Knecht", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Welcome to Agents Week

By Rita Kozlov, Dane Knecht, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-12


# Welcome to Agents Week

2026-04-12

- [![Rita Kozlov](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/56u5zfWi9255rUocOgksl0/5eb2eb16e26893d259f7b00af85e8417/rita.png)

](/author/rita/)[Rita Kozlov](/author/rita/)
- [![Dane Knecht](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2Vb2AhRye3notdj8Q605bw/15216da4779b7ef162916df8ea5ebcf3/Screenshot_2025-09-22_at_1.23.33%C3%A2__PM.png)

](/author/dane-knecht/)[Dane Knecht](/author/dane-knecht/)

8 min readThis post is also available in [简体中文](/zh-cn/welcome-to-agents-week), [Français](/fr-fr/welcome-to-agents-week), [Deutsch](/de-de/welcome-to-agents-week), [Italiano](/it-it/welcome-to-agents-week), [日本語](/ja-jp/welcome-to-agents-week), [한국어](/ko-kr/welcome-to-agents-week), [Español (Latinoamérica)](/es-la/welcome-to-agents-week), [Español](/es-es/welcome-to-agents-week) and [繁體中文](/zh-tw/welcome-to-agents-week).![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7FZ3OkhaKLE5pZppX0kDMo/0e97d8a296da63fba03ab7bf36b67af9/BLOG-3238_1.png)

Cloudflare's mission has always been to help build a better Internet. Sometimes that means building for the Internet as it exists. Sometimes it means building for the Internet as it's about to become. 

Today, we're kicking off Agents Week, dedicated to building the Internet for what comes next.


    
      
## The Internet wasn't built for the age of AI. Neither was the cloud.


      [
        
      ](#the-internet-wasnt-built-for-the-age-of-ai-neither-was-the-cloud)
    
    The cloud, as we know it, was a product of the last major technological paradigm shift: smartphones.

When smartphones put the Internet in everyone's pocket, they didn't just add users — they changed the nature of what it meant to be online. Always connected, always expecting an instant response. Applications had to handle an order of magnitude more users, and the infrastructure powering them had to evolve.

The approach the industry converged on was straightforward: more users, more copies of your application. As applications grew in complexity, teams broke them into smaller pieces — microservices — so each team could control its own destiny. But the core principle stayed the same: a finite number of applications, each serving many users. Scale meant more copies.

Kubernetes and containers became the default. They made it easy to spin up instances, load balance, and tear down what you didn't need. Under this one-to-many model, a single instance could serve many users, and even as user counts grew into the billions, the number of things you had to manage stayed finite.

Agents break this.


    
      
## One user, one agent, one task


      [
        
      ](#one-user-one-agent-one-task)
    
    Unlike every application that came before them, agents are one-to-one. Each agent is a unique instance. Serving one user, running one task. Where a traditional application follows the same execution path regardless of who's using it, an agent requires its own execution environment: one where the LLM dictates the code path, calls tools dynamically, adjusts its approach, and persists until the task is done.

Think of it as the difference between a restaurant and a personal chef. A restaurant has a menu — a fixed set of options — and a kitchen optimized to churn them out at volume. That's most applications today. An agent is more like a personal chef who asks: what do you want to eat? They might need entirely different ingredients, utensils, or techniques each time. You can't run a personal-chef service out of the same kitchen setup you'd use for a restaurant.

Over the past year, we've seen agents take off, with coding agents leading the way — not surprisingly, since developers tend to be early adopters. The way most coding agents work today is by spinning up a container to give the LLM what it needs: a filesystem, git, bash, and the ability to run arbitrary binaries.

But coding agents are just the beginning. Tools like Claude Cowork are already making agents accessible to less technical users. Once agents move beyond developers and into the hands of everyone — administrative assistants, research analysts, customer service reps, personal planners — the scale math gets sobering fast.


    
      
## The math on scaling agents to the masses


      [
        
      ](#the-math-on-scaling-agents-to-the-masses)
    
    If the more than 100 million knowledge workers in the US each used an agentic assistant at ~15% concurrency, you'd need capacity for approximately 24 million simultaneous sessions. At 25–50 users per CPU, that's somewhere between 500K and 1M server CPUs — just for the US, with one agent per person.

Now picture each person running several agents in parallel. Now picture the rest of the world with more than 1 billion knowledge workers. We're not a little short on compute. We're orders of magnitude away.

So how do we close that gap?


    
      
## Infrastructure built for agents


      [
        
      ](#infrastructure-built-for-agents)
    
    Eight years ago, we launched [Workers](https://workers.cloudflare.com/) — the beginning of our developer platform, and a bet on containerless, serverless compute. The motivation at the time was practical: we needed lightweight compute without cold-starts for customers who depended on Cloudflare for speed. Built on V8 isolates rather than containers, Workers turned out to be an order of magnitude more efficient — faster to start, cheaper to run, and natively suited to the "spin up, execute, tear down" pattern.

What we didn't anticipate was how well this model would map to the age of agents.

Where containers give every agent a full commercial kitchen: bolted-down appliances, walk-in fridges, the works, whether the agent needs them or not, isolates, on the other hand, give the personal chef exactly the counter space, the burner, and the knife they need for this particular meal. Provisioned in milliseconds. Cleaned up the moment the dish is served.


          ![BLOG-3238 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3UM1NukO0Ho4lQAYk5CoU8/30e1376c4fe61e86204a0de92ae4612b/BLOG-3238_2.png)

In a world where we need to support not thousands of long-running applications, but billions of ephemeral, single-purpose execution environments — isolates are the right primitive. 

Each one starts in milliseconds. Each one is securely sandboxed. And you can run orders of magnitude more of them on the same hardware compared to containers.

Just a few weeks ago, we took this further with the [Dynamic Workers open beta](https://blog.cloudflare.com/dynamic-workers/): execution environments spun up at runtime, on demand. An isolate takes a few milliseconds to start and uses a few megabytes of memory. That's roughly 100x faster and up to 100x more memory-efficient than a container. 

You can start a new one for every single request, run a snippet of code, and throw it away — at a scale of millions per second.

For agents to move beyond early adopters and into everyone's hands, they also have to be affordable. Running each agent in its own container is expensive enough that agentic tools today are mostly limited to coding assistants for engineers who can justify the cost. **Isolates, by running orders of magnitude more efficiently, are what make per-unit economics viable at the scale agents require.**


          ![BLOG-3238 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6iiD7zACxMNEDdvJWM6zbo/2261c320f3be3cd2fa6ef34593a1ee09/BLOG-3238_3.png)


    
      
## The horseless carriage phase


      [
        
      ](#the-horseless-carriage-phase)
    
    While it’s critical to build the right foundation for the future, we’re not there yet. And every paradigm shift has a period where we try to make the new thing work within the old model. The first cars were called "horseless carriages." The first websites were digital brochures. The first mobile apps were shrunken desktop UIs. We're in that phase now with agents.

You can see it everywhere. 

We're giving agents headless browsers to navigate websites designed for human eyes, when what they need are structured protocols like MCP to discover and invoke services directly. 

Many early MCP servers are thin wrappers around existing REST APIs — same CRUD operations, new protocol — when LLMs are actually far better at writing code than making sequential tool calls. 

We're using CAPTCHAs and behavioral fingerprinting to verify the thing on the other end of a request, when increasingly that thing is an agent acting on someone's behalf — and the right question isn't "are you human?" but "which agent are you, who authorized you, and what are you allowed to do?"

We're spinning up full containers for agents that just need to make a few API calls and return a result.

These are just a few examples, but none of this is surprising. It's what transitions look like.


    
      
## Building for both


      [
        
      ](#building-for-both)
    
    The Internet is always somewhere between two eras. IPv6 is objectively better than IPv4, but dropping IPv4 support would break half the Internet. HTTP/2 and HTTP/3 coexist. TLS 1.2 still hasn't fully given way to 1.3. The better technology exists, the old technology persists, and the job of infrastructure is to bridge both.

Cloudflare has always been in the business of bridging these transitions. The shift to agents is no different.

Coding agents genuinely need containers — a filesystem, git, bash, arbitrary binary execution. That's not going away. This week, our container-based sandbox environments are going GA, because we're committed to making them the best they can be. We're going deeper on browser rendering for agents, because there will be a long tail of services that don't yet speak MCP, and agents will still need to interact with them. These aren't stopgaps — they're part of a complete platform.

But we're also building what comes next: the isolates, the protocols, and the identity models that agents actually need. Our job is to make sure you don't have to choose between what works today and what's right for tomorrow.


    
      
## Security in the model, not around it


      [
        
      ](#security-in-the-model-not-around-it)
    
    If agents are going to handle our professional and personal tasks — reading our email, operating on our code, interacting with our financial services — then security has to be built into the execution model, not layered on after the fact.

CISOs have been the first to confront this. The productivity gains from putting agents in everyone's hands are real, but today, most agent deployments are fraught with risk: prompt injection, data exfiltration, unauthorized API access, opaque tool usage. 

A developer's vibe-coding agent needs access to repositories and deployment pipelines. An enterprise's customer service agent needs access to internal APIs and user data. In both cases, securing the environment today means stitching together credentials, network policies, and access controls that were never designed for autonomous software.

Cloudflare has been building two platforms in parallel: our developer platform, for people who build applications, and our zero trust platform, for organizations that need to secure access. For a while, these served distinct audiences. 

But "how do I build this agent?" and "how do I make sure it's safe?" are increasingly the same question. We're bringing these platforms together so that all of this is native to how agents run, not a separate layer you bolt on.


    
      
## Agents that follow the rules


      [
        
      ](#agents-that-follow-the-rules)
    
    There's another dimension to the agent era that goes beyond compute and security: economics and governance.

When agents interact with the Internet on our behalf — reading articles, consuming APIs, accessing services — there needs to be a way for the people and organizations who create that content and run those services to set terms and get paid. Today, the web's economic model is built around human attention: ads, paywalls, subscriptions. 

Agents don't have attention (well, not that [kind of attention](https://arxiv.org/abs/1706.03762)). They don't see ads. They don't click through cookie banners.

If we want an Internet where agents can operate freely *and* where publishers, content creators, and service providers are fairly compensated, we need new infrastructure for it. We’re building tools that make it easy for publishers and content owners to set and enforce policies for how agents interact with their content.

Building a better Internet has always meant making sure it works for everyone — not just the people building the technology, but the people whose work and creativity make the Internet worth using. That doesn't change in the age of agents. It becomes more important.


    
      
## The platform for developers and agents


      [
        
      ](#the-platform-for-developers-and-agents)
    
    Our vision for the developer platform has always been to provide a comprehensive platform that just works: from experiment, to MVP, to scaling to millions of users. But providing the primitives is only part of the equation. A great platform also has to think about how everything works together, and how it integrates into your development flow.

That job is evolving. It used to be purely about developer experience, making it easy for humans to build, test, and ship. Increasingly, it's also about helping agents help humans, and making the platform work not just for the people building agents, but for the agents themselves. Can an agent find the latest most up-to- date best practices? How easily can it discover and invoke the tools and CLIs it needs? How seamlessly can it move from writing code to deploying it?

This week, we're shipping improvements across both dimensions — making Cloudflare better for the humans building on it and for the agents running on it.


    
      
## Building for the future is a team sport


      [
        
      ](#building-for-the-future-is-a-team-sport)
    
    Building for the future is not something we can do alone. Every major Internet transition from HTTP/1.1 to HTTP/2 and HTTP/3, from TLS 1.2 to 1.3 — has required the industry to converge on shared standards. The shift to agents will be no different.

Cloudflare has a long history of contributing to and helping push forward the standards that make the Internet work. We've been [deeply involved in the IETF](https://blog.cloudflare.com/tag/ietf/) for over a decade, helping develop and deploy protocols like QUIC, TLS 1.3, and Encrypted Client Hello. We were a founding member of WinterTC, the ECMA technical committee for JavaScript runtime interoperability. We open-sourced the Workers runtime itself, because we believe the foundation should be open.

We're bringing the same approach to the agentic era. We're excited to be part of the Linux Foundation and AAIF, and to help support and push forward standards like MCP that will be foundational for the agentic future. Since Anthropic introduced MCP, we've worked closely with them to build the infrastructure for remote MCP servers, open-sourced our own implementations, and invested in making the protocol practical at scale. 

Last year, alongside Coinbase, we [co-founded the x402 Foundation](https://blog.cloudflare.com/x402/), an open, neutral standard that revives the long-dormant HTTP 402 status code to give agents a native way to pay for the services and content they consume. 

Agent identity, authorization, payment, safety: these all need open standards that no single company can define alone.


    
      
## Stay tuned


      [
        
      ](#stay-tuned)
    
    This week, we're making announcements across every dimension of the agent stack: compute, connectivity, security, identity, economics, and developer experience.

The Internet wasn't built for AI. The cloud wasn't built for agents. But Cloudflare has always been about helping build a better Internet — and what "better" means changes with each era. This is the era of agents. This week, [follow along](https://blog.cloudflare.com/) and we'll show you what we're building for it.

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Cloudflare Workers](/tag/workers/)[Workers AI](/tag/workers-ai/)[AI](/tag/ai/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)[Serverless](/tag/serverless/)
