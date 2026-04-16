---
title: "Managed OAuth for Access: make internal apps agent-ready in one click"
date: 2026-04-14
url: https://blog.cloudflare.com/managed-oauth-for-access/
authors: ["Eduardo Gomes", "James Royal", "Ann Ming Samborski", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Managed OAuth for Access: make internal apps agent-ready in one click

By Eduardo Gomes, James Royal, Ann Ming Samborski, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-14


# Managed OAuth for Access: make internal apps agent-ready in one click

2026-04-14

- [![Eduardo Gomes](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1eYUzlWbnrHRIdnSTMTJoX/081554de65d939b8cdd0500f8320f895/eduardo.jpg)

](/author/eduardo/)[Eduardo Gomes](/author/eduardo/)
- [![James Royal](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/YocfF1XOpE1uWjYFNCtIa/ca56518fd233a2b4ce02398be5c35462/james-royal.jpg)

](/author/james-royal/)[James Royal](/author/james-royal/)
- [![Ann Ming Samborski](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4K0P5wAoqGbOXiq1av6lQG/79f00a158601cad50455f23a261c6c7f/headshot-small.png)

](/author/ann-ming-samborski/)[Ann Ming Samborski](/author/ann-ming-samborski/)

8 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2BOZcg3hHEjTy2YzQxKkih/94c62468f30da1924c5fee21bb9cfebf/BLOG-3146_1.png)

We have thousands of internal apps at Cloudflare. Some are things we’ve built ourselves, others are self-hosted instances of software built by others. They range from business-critical apps nearly every person uses, to side projects and prototypes.

All of these apps are protected by [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/). But when we started using and building agents — particularly for uses beyond writing code — we hit a wall. People could access apps behind Access, but their agents couldn’t.

Access sits in front of internal apps. You define a policy, and then Access will send unauthenticated users to a login page to choose how to authenticate. 


          ![BLOG-3146 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3867rU5n4IkRilnfCAvOLD/8ec5ea3c25dbd6620a8644d231893732/BLOG-3146_2.png)

*Example of a Cloudflare Access login page*

This flow worked great for humans. But all agents could see was a redirect to a login page that they couldn’t act on.

Providing agents with access to internal app data is so vital that we immediately implemented a stopgap for our own internal use. We modified OpenCode’s [web fetch tool](https://opencode.ai/docs/tools/#webfetch) such that for specific domains, it triggered the [cloudflared](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/) CLI to open an authorization flow to fetch a [JWT](https://www.cloudflare.com/learning/access-management/token-based-authentication/) (JSON Web Token). By appending this token to requests, we enabled secure, immediate access to our internal ecosystem.

While this solution was a temporary answer to our own dilemma, today we’re retiring this workaround and fixing this problem for everyone. Now in open beta, every Access application supports managed OAuth. One click to enable it for an Access app, and agents that speak OAuth 2.0 can easily discover how to authenticate ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)), send the user through the auth flow, and receive back an authorization token (the same JWT from our initial solution). 

Now, the flow works smoothly for both humans and agents. Cloudflare Access has a generous [free tier](https://www.cloudflare.com/plans/zero-trust-services/). And building off our newly-introduced [Organizations beta](https://blog.cloudflare.com/organizations-beta/), you’ll soon be able to bridge identity providers across Cloudflare accounts too.


    
      
## How managed OAuth works


      [
        
      ](#how-managed-oauth-works)
    
    For a given internal app protected by Cloudflare Access, you enable managed OAuth in one click:


          ![BLOG-3146 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/79FSFNeaDbqn9DkSyfKrtz/5f0fd06ce9e127c06474263a529ec284/BLOG-3146_3.png)

Once managed OAuth is enabled, Cloudflare Access acts as the authorization server. It returns the `www-authenticate` header, telling unauthorized agents where to look up information on how to get an authorization token. They find this at `https://<your-app-domain>/.well-known/oauth-authorization-server`. Equipped with that direction, agents can just follow OAuth standards: 

1. The agent dynamically registers itself as a client (a process known as Dynamic Client Registration — [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)),
2. The agent sends the human through a PKCE (Proof Key for Code Exchange) authorization flow ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636))
3. The human authorizes access, which grants a token to the agent that it can use to make authenticated requests on behalf of the user

Here’s what the authorization flow looks like:


          ![BLOG-3146 4](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2LkJMuPCNX1Mu7MfEnFinH/fef5cf3f87e83d93c49ffeadbe6aed4d/BLOG-3146_4.png)

If this authorization flow looks familiar, that’s because it’s what the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/specification/) uses. We originally built support for this into our [MCP server portals](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/) product, which proxies and controls access to many MCP servers, to allow the portal to act as the OAuth server. Now, we’re bringing this to all Access apps so agents can access not only MCP servers that require authorization, but also web pages, web apps, and REST APIs.


    
      
## Mass upgrading your internal apps to be agent-ready


      [
        
      ](#mass-upgrading-your-internal-apps-to-be-agent-ready)
    
    Upgrading the long tail of internal software to work with agents is a daunting task. In principle, in order to be agent-ready, every internal and external app would ideally have discoverable APIs, a CLI, a well-crafted MCP server, and have adopted the many emerging agent standards.

AI adoption is not something that can wait for everything to be retrofitted. Most organizations have a significant backlog of apps built over many years. And many internal “apps” work great when treated by agents as simple websites. For something like an internal wiki, all you really need is to enable [Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/), turn on managed OAuth, and agents have what they need to read protected content.

To make the basics work across the widest set of internal applications, we use Managed OAuth. By putting Access in front of your legacy internal apps, you make them agent-ready instantly. No code changes, no retrofitting. Instead, just immediate compatibility.


    
      
## It’s the user’s agent. No service accounts and tokens needed


      [
        
      ](#its-the-users-agent-no-service-accounts-and-tokens-needed)
    
    Agents need to act on behalf of users inside organizations. One of the biggest anti-patterns we’ve seen is people provisioning service accounts for their agents and MCP servers, authenticated using static credentials. These have their place in simple use cases and quick prototypes, and Cloudflare Access supports [service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/) for this purpose.

But the service account approach quickly shows its limits when fine-grained access controls and audit logs are required. We believe that every action an agent performs must be easily attributable to the human who initiated it, and that an agent must only be able to perform actions that its human operator is likewise authorized to do. Service accounts and static credentials become points at which attribution is lost. Agents that launder all of their actions through a service account are susceptible to [confused deputy problems](https://en.wikipedia.org/wiki/Confused_deputy_problem) and result in audit logs that appear to originate from the agent itself.

For security and accountability, agents must use security primitives capable of expressing this user–agent relationship. OAuth is the industry standard protocol for requesting and delegating access to third parties. It gives agents a way to talk to your APIs on behalf of the user, with a token scoped to the user’s identity, so that access controls correctly apply and audit logs correctly attribute actions to the end user.


    
      
## Standards for the win: how agents can and should adopt RFC 9728 in their web fetch tools


      [
        
      ](#standards-for-the-win-how-agents-can-and-should-adopt-rfc-9728-in-their-web-fetch-tools)
    
    [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) is the OAuth standard that makes it possible for agents to discover where and how to authenticate. It standardizes where this information lives and how it’s structured. This RFC became official in April 2025 and was quickly adopted by the Model Context Protocol (MCP), which now [requires that both MCP servers and clients support it](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

But outside of MCP, agents should adopt RFC 9728 for an even more essential use case: making requests to web pages that are protected behind OAuth and making requests to plain old REST APIs.

Most agents have a tool for making basic HTTP requests to web pages. This is commonly called the [“web fetch” tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool). It’s similar to using the [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API in JavaScript, often with some additional post-processing on the response. It’s what lets you paste a URL into your agent and have your agent go look up the content.

Today, most agents’ web fetch tools won’t do anything with the `www-authenticate` header that a URL returns. The underlying model might choose to introspect the response headers and figure this out on its own, but the tool itself does not follow `www-authenticate`, look up `/.well-known/oauth-authorization-server`, and act as the client in the OAuth flow. But it *can*, and we strongly believe it *should*! Agents already do this to act as remote MCP clients.

To demonstrate this, we’ve put up a draft pull request that [adapts the web fetch tool in Opencode](https://github.com/anomalyco/opencode/pull/22096/) to show this in action. Before making a request, the adapted tool first checks whether it already has credentials ; if it does, it uses them to make the initial request. If the tool gets back a 401 or a 403 with a `www-authenticate` header, it asks the user for consent to be sent through the server’s OAuth flow.

Here’s how that OAuth flow works. If you give the agent a URL that is protected by OAuth and complies with RFC 9728, the agent prompts the human for consent to open the authorization flow:


          ![BLOG-3146 5](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1vo4hGtVz7ovlNQslTvTal/3d2b1a861b9342842bd6297e1869aed4/BLOG-3146_5.png)

…sending the human to the login page:


          ![BLOG-3146 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3867rU5n4IkRilnfCAvOLD/8ec5ea3c25dbd6620a8644d231893732/BLOG-3146_2.png)

…and then to a consent dialog that prompts the human to grant access to the agent:


          ![BLOG-3146 6](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/39I0yjWXKGLNG4mhV5jEPQ/793559a5f18a04e807939b9560118ccb/BLOG-3146_6.png)

Once the human grants access to the agent, the agent uses the token it has received to make an authenticated request:


          ![BLOG-3146 7](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4e0mNkih5xtbAoQpwBrB32/701089e8ea256804890d45af08ef04ca/BLOG-3146_7.png)

Any agent from Codex to Claude Code to Goose and beyond can implement this, and there’s nothing bespoke to Cloudflare. It’s all built using OAuth standards.

We think this flow is powerful, and that supporting RFC 9728 can help agents with more than just making basic web fetch requests. If a REST API supports RFC 9728 (and the agent does too), the agent has everything it needs to start making authenticated requests against that API. If the REST API supports [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727), then the client can discover a catalog of REST API endpoints on its own, and do even more without additional documentation, agent skills, MCP servers or CLIs. 

Each of these play important roles with agents — Cloudflare itself provides an [MCP server for the Cloudflare API](https://blog.cloudflare.com/code-mode-mcp/) (built using [Code Mode](https://blog.cloudflare.com/code-mode/)), [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/commands/), and [Agent Skills](https://github.com/cloudflare/skills), and a [Plugin](https://x.com/CloudflareDev/status/2037336582815175122). But supporting RFC 9728 helps ensure that even when none of these are preinstalled, agents have a clear path forward. If the agent has a [sandbox to execute untrusted code](https://blog.cloudflare.com/dynamic-workers/), it can just write and execute code that calls the API that the human has granted it access to. We’re working on supporting this for Cloudflare’s own APIs, to help your agents understand how to use Cloudflare.


    
      
## Coming soon: share one identity provider (IdP) across many Cloudflare accounts


      [
        
      ](#coming-soon-share-one-identity-provider-idp-across-many-cloudflare-accounts)
    
    At Cloudflare our own internal apps are deployed to dozens of different Cloudflare accounts, which are all part of an Organization — a [newly introduced](https://blog.cloudflare.com/organizations-beta/) way for administrators to manage users, configurations, and view analytics across many Cloudflare accounts. We have had the same challenge as many of our customers: each Cloudflare account has to separately configure an IdP, so Cloudflare Access uses our identity provider. It’s critical that this is consistent across an organization — you don’t want one Cloudflare account to inadvertently allow people to sign in just with a one-time PIN, rather than requiring that they authenticate via single-sign on (SSO).

To solve this, we’re currently working on making it possible to share an identity provider across Cloudflare accounts, giving organizations a way to designate a single primary IdP for use across every account in their organization.

As new Cloudflare accounts are created within an organization, administrators will be able to configure a bridge to the primary IdP with a single click, so Access applications across accounts can be protected by one identity provider. This removes the need to manually configure IdPs account by account, which is a process that doesn’t scale for organizations with many teams and individuals each operating their own accounts.


    
      
## What’s next


      [
        
      ](#whats-next)
    
    Across companies, people in every role and business function are now using agents to build internal apps, and expect their agents to be able to access context from internal apps. We are responding to this step function growth in internal software development by making the [Workers Platform](https://workers.cloudflare.com/) and [Cloudflare One](https://developers.cloudflare.com/cloudflare-one/) work better together — so that it is easier to build and secure internal apps on Cloudflare. 

Expect more to come soon, including:

- More direct integration between Cloudflare Access and Cloudflare Workers, without the need to validate JWTs or remember which of many routes a particular Worker is exposed on.
- [wrangler dev --tunnel](https://github.com/cloudflare/workers-sdk/pull/13126) — an easy way to expose your local development server to others when you’re building something new, and want to share it with others before deploying
- A CLI interface for Cloudflare Access and the [entire Cloudflare API](https://blog.cloudflare.com/cf-cli-local-explorer/)
- More announcements to come during Agents Week 2026


    
      
## Enable Managed OAuth for your internal apps behind Cloudflare Access


      [
        
      ](#enable-managed-oauth-for-your-internal-apps-behind-cloudflare-access)
    
    Managed OAuth is now available, in open beta, to all Cloudflare customers. Head over to the [Cloudflare dashboard](https://dash.cloudflare.com/) to enable it for your Access applications. You can use it for any internal app, whether it’s one built on [Cloudflare Workers](https://workers.cloudflare.com/), or hosted elsewhere. And if you haven’t built internal apps on the Workers Platform yet — it’s the fastest way for your team to go from zero to deployed (and protected) in production.

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Security](/tag/security/)[Zero Trust](/tag/zero-trust/)[SASE](/tag/sase/)[Cloudflare Access](/tag/cloudflare-access/)[Cloudflare One](/tag/cloudflare-one/)[AI](/tag/ai/)[Developers](/tag/developers/)[Developer Platform](/tag/developer-platform/)
