---
title: "Register domains wherever you build: Cloudflare Registrar API now in beta"
date: 2026-04-15
url: https://blog.cloudflare.com/registrar-api-beta/
authors: ["Ankit Shah", "Carlos Armada", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Register domains wherever you build: Cloudflare Registrar API now in beta

By Ankit Shah, Carlos Armada, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-15


# Register domains wherever you build: Cloudflare Registrar API now in beta

2026-04-15

- [![Ankit Shah](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1bE8UywbAYaS6qH1q44X6p/d949cb52d897c51fbddc91d0a253477e/Ankit_Shah.png)

](/author/ankit-shah/)[Ankit Shah](/author/ankit-shah/)
- [![Carlos Armada](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1O8wYmugQ1gybXSQsqqFNk/6557fa7b47d57573bef8bf025b37bd0e/Carlos_Armada.webp)

](/author/carlos-armada/)[Carlos Armada](/author/carlos-armada/)

4 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3PfGp6zXziQeEqtKsh7QMc/25838361661682720a882dd04519a7d4/image3.png)

Today we're launching the next chapter of Cloudflare Registrar: the **Registrar API in beta**.

The Registrar API makes it possible to search for domains, check availability, and register them programmatically. Now, buying a domain the moment an idea starts to feel real no longer has to pull you out of the agentic workflow.

A Registrar API has been one of the clearest asks from builders using Cloudflare. As more of the agentic workflow has moved into editors, terminals, and agent-driven tools, domain registration became the obvious gap to close.

When we launched [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) seven years ago, the idea was simple. Domains should be offered [at cost](https://www.cloudflare.com/application-services/solutions/low-cost-domain-names/), with no markup and no games. Since then, Cloudflare Registrar has become one of the fastest growing registrars in the world as more people choose Cloudflare as the place to build their next project.


  


*Prompting an agent inside an AI code editor to generate name ideas, search, check, and purchase a domain.*


    
      
## Built for agents and automation


      [
        
      ](#built-for-agents-and-automation)
    
    The Registrar API is designed to work well anywhere software is already being built: inside editors, deployment pipelines, backend services, and agent-driven workflows.

The workflow is intentionally simple and machine-friendly. `Search` returns candidate names. `Check` returns real-time availability and pricing. `Register` takes a minimal request and returns a workflow-shaped response that can complete immediately or be polled if it takes longer. That makes it straightforward to use for traditional API clients and for [AI agents](https://www.cloudflare.com/learning/ai/what-is-agentic-ai/) acting on a user's behalf.

In practice, all this means that an agent can help with the full flow: suggest names, confirm which one is actually registrable, surface the price for approval, and then complete the purchase without forcing the user out of the tool they are already using.


    
      
## The Registrar API


      [
        
      ](#the-registrar-api)
    
    At its core, this first release of the Registrar API does three things

- `Search` for domains
- `Check` availability
- `Register` domains

For a curated set of popular TLDs to start, see the [Registrar API docs](https://developers.cloudflare.com/api/resources/registrar). When supported, [premium domains](https://www.cloudflare.com/learning/dns/glossary/premium-domains/) can also be registered, but they require explicit fee acknowledgement.

The Registrar API is part of the full Cloudflare API, which means agents already have access to it today through the [Cloudflare MCP](https://blog.cloudflare.com/code-mode-mcp/). It does not require a separate integration or a custom tool definition. An agent working in Cursor, Claude Code, or any MCP-compatible environment can discover and call Registrar endpoints using the same `search()` and `execute()` pattern that covers the entire Cloudflare API surface. The moment the API was part of our spec, it was ready for agents.

*What it looks like in practice*:

You're building a new project in your favorite AI code editor. Halfway through scaffolding, you ask your agent: "Find me a good .dev domain for this project and register it."

The agent searches for candidate names based on your project. It checks real-time availability for the one you pick and confirms the price. You say yes. It registers the domain, using your account's default contact info and payment method automatically. By the time you've read the response, the domain is registered, and privacy is on.

Three API calls. A few seconds.

*What it looks like in code*:


    
      
### Step 1: Search for domain names


      [
        
      ](#step-1-search-for-domain-names)
    
    Use the `search` endpoint to submit a domain query, with or without a domain extension.


            
```JavaScript
async () => {
  return cloudflare.request({
    method: "GET",
    path: `/accounts/${accountId}/registrar/domain-search`,
    query: { q: "acme corp", limit: 3 },
  });
}
```


            
            
```JSON
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "domains": [
      {
        "name": "acmecorp.com",
        "registrable": true,
        "tier": "standard",
        "pricing": {
          "currency": "USD",
          "registration_cost": "8.57",
          "renewal_cost": "8.57"
        }
      },
      {
        "name": "acmecorp.dev",
        "registrable": true,
        "tier": "standard",
        "pricing": {
          "currency": "USD",
          "registration_cost": "10.11",
          "renewal_cost": "10.11"
        }
      },
      {
        "name": "acmecorp.app",
        "registrable": true,
        "tier": "standard",
        "pricing": {
          "currency": "USD",
          "registration_cost": "11.00",
          "renewal_cost": "11.00"
        }
      }
    ]
  }
}
```


            
    
      
### Step 2: Check availability and pricing


      [
        
      ](#step-2-check-availability-and-pricing)
    
    Search results are fast but non-authoritative; they're based on cached data, and availability can change in seconds for popular names. `Check` queries the registry directly. Call it immediately before registering, and use its price response as the source of truth.


            
```JavaScript
async () => {
  return cloudflare.request({
    method: "POST",
    path: `/accounts/${accountId}/registrar/domain-check`,
    body: { domains: ["acmecorp.dev"] },
  });
}
```


            
            
```JSON
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "domains": [
      {
        "name": "acmecorp.dev",
        "registrable": true,
        "tier": "standard",
        "pricing": {
          "currency": "USD",
          "registration_cost": "10.11",
          "renewal_cost": "10.11"
        }
      }
    ]
  }
}
```


            
    
      
### Step 3: Register the domain


      [
        
      ](#step-3-register-the-domain)
    
    The only required field is the domain name. WHOIS privacy protection is enabled by default at no extra charge. If your account has a default registrant contact, the API uses it automatically; otherwise you can provide contact details inline in the request. Your default payment method is used automatically.


            
```JavaScript
async () => {
  return cloudflare.request({
    method: "POST",
    path: `/accounts/${accountId}/registrar/registrations`,
    body: { domain_name: "acmecorp.dev" },
  });
}
```


            
            
```JSON
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "domain_name": "acmecorp.dev",
    "state": "succeeded",
    "completed": true,
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T10:00:03Z",
    "context": {
      "registration": {
        "domain_name": "acmecorp.dev",
        "status": "active",
        "created_at": "2025-10-27T10:00:00Z",
        "expires_at": "2026-10-27T10:00:00Z",
        "auto_renew": true,
        "privacy_enabled": true,
        "locked": true
      }
    },
    "links": {
      "self": "/accounts/abc/registrar/registrations/acmecorp.dev/registration-status",
      "resource": "/accounts/abc/registrar/registrations/acmecorp.dev"
    }
  }
}
```


            Registration typically completes synchronously within seconds. If it takes longer, the API returns a 202 Accepted with a workflow URL to poll. The response shape is the same either way, no special-casing needed. For premium domains, the `Check` response returns the exact registry-set price, and the `Register` request echoes that back as an explicit fee acknowledgement.


    
      
### A note on agents and non-refundable purchases


      [
        
      ](#a-note-on-agents-and-non-refundable-purchases)
    
    When an agent registers a domain on your behalf, it charges your default payment method. Domain registrations are non-refundable once complete. A well-designed agent flow should confirm the domain name and price with the user before calling the registration endpoint. The `Check` step exists precisely to make that confirmation step explicit and unambiguous. The API gives you the tools to build it correctly; the responsibility to do so belongs in your agent's logic.

By default, our API docs have explicit agent-facing instructions to seek permission from the user during the register API call. **Still, it is the responsibility of the human to design an agent flow that will not buy domains without your approval**.


    
      
## Why Cloudflare can do this differently


      [
        
      ](#why-cloudflare-can-do-this-differently)
    
    What makes Cloudflare different from many developer platforms now adding domain workflows is that Cloudflare operates the registrar itself. That means the same platform where a project is built and deployed can also search for, register, and manage the domain — without adding markup on top.

At-cost pricing is at the core of Cloudflare’s registrar model. We charge exactly what the registry charges. That holds true whether you're registering a domain through the dashboard, calling the API directly, or asking an agent to do it on your behalf.


    
      
## Where the API goes next


      [
        
      ](#where-the-api-goes-next)
    
    This beta focuses on the first critical moment in the domain lifecycle: search, check, and registration. We are actively working on expanding the API to cover more of the core Registrar experience, so domains can be managed programmatically after they are purchased, not just at the moment they are created. This will include lifecycle elements like transfers, renewals, contact updates, and more.

The API is the first step toward a broader registrar-as-a-service offering. Development of that service is underway now, and we’re aiming to launch it later this year. As the API expands, platforms like website builders, hosting providers, AI products, and other multi-tenant applications will be able to make domain registration part of their own user experience. Users can search for a domain, buy it, and provision it without ever leaving the service or agent-driven workflow they are already building in.


    
      
## Start building today


      [
        
      ](#start-building-today)
    
    The Registrar API exists because builders asked for it. Now that it’s available as a beta, we’d love to see what you build, in the [Cloudflare Community](https://community.cloudflare.com/) or on [X](https://x.com/cloudflare), or on [Discord](https://discord.com/invite/cloudflaredev).

To get started:

- Review the [Registrar API guide](https://developers.cloudflare.com/registrar/registrar-api/)
- Check out the [API reference](https://developers.cloudflare.com/api/resources/registrar)

Please let us know if something is missing, if a workflow breaks down, or if you are building toward a larger platform use case. We’re working quickly to expand the functionality of the API to support domain renewals, transfers, and more.

We can’t wait to see what you build!

*Special thanks to Lucy Dryaeva and Fred Pinto for their valuable contributions to delivering the Registrar API beta.*

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Registrar](/tag/registrar/)[Developers](/tag/developers/)[AI](/tag/ai/)[API](/tag/api/)[Developer Platform](/tag/developer-platform/)[Agents](/tag/agents/)[Agents Week](/tag/agents-week/)
