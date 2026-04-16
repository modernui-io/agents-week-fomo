---
title: "Securing non-human identities: automated revocation, OAuth, and scoped permissions"
date: 2026-04-14
url: https://blog.cloudflare.com/improved-developer-security/
authors: ["Justin Hutchings", "Adam Bouhmad", "Rebecca Varley", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Securing non-human identities: automated revocation, OAuth, and scoped permissions

By Justin Hutchings, Adam Bouhmad, Rebecca Varley, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-14


# Securing non-human identities: automated revocation, OAuth, and scoped permissions

2026-04-14

- [![Justin Hutchings](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/77DrBJz94Y6c76oAVbQmWU/39c3992ba59acba3ce8ee5978fcadb9f/a4bb0323-9b23-4f03-9bce-f1c28e974668.jpg)

](/author/justin-hutchings/)[Justin Hutchings](/author/justin-hutchings/)
- [![Adam Bouhmad](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4aseXY5rjB2mooBiPmcQ9P/77d7246cb53fadde4bbc892adb14759e/Adam_Bouhmad_.webp)

](/author/adam-bouhmad/)[Adam Bouhmad](/author/adam-bouhmad/)
- [![Rebecca Varley](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6czeLFcyZOKqw8eWEXlIvA/dcc772e8e24a44089945520220ca75e0/71352e7e-45c6-4e48-97f0-da77ef38a0ac_800x800.png)

](/author/rebecca-varley/)[Rebecca Varley](/author/rebecca-varley/)

8 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/12oLba01zeRh7qKjtPoxTS/d267216179b34e92be7e271cc06c7385/BLOG-3216_1.png)

Agents let you build software faster than ever, but securing your environment and the code you write — from both mistakes and malice — takes real effort. [Open Web Application Security Project](https://www.cloudflare.com/learning/security/threats/owasp-top-10/) (OWASP) details a number of [risks](https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/) present in agentic AI systems, including the risk of credential leaks, user impersonation, and elevation of privilege. These risks can result in extreme damage to your environments including denial of service, data loss, or data leaks — which can do untold financial and reputational damage.  

This is an identity problem. In modern development, "identities" aren't just people — they are the agents, scripts, and third-party tools that act on your behalf. To secure these non-human identities, you need to manage their entire lifecycle: ensuring their credentials (tokens) aren't leaked, seeing which applications have access via OAuth, and narrowing their permissions using granular RBAC.

Today, we are introducing updates to address these needs: scannable tokens to protect your credentials,** **OAuth visibility to manage your principals, and resource-scoped RBAC to fine-tune your policies.


    
      
## Understanding identity: Principals, Credentials, and Policies


      [
        
      ](#understanding-identity-principals-credentials-and-policies)
    
    To secure the Internet in an era of [autonomous agents](https://www.cloudflare.com/learning/ai/what-is-agentic-ai/), we have to rethink how we handle identity. Whether a request comes from a human developer or an AI agent, every interaction with an API relies on three core pillars:

- **The Principal (The Traveler):** This is the identity itself — the "who." It might be you logging in via OAuth, or a background agent using an API token to deploy code.
- **The Credential (The Passport):** This is the proof of that identity. In this world, your API token is your passport. If it’s stolen or leaked, anyone can "wear" your identity.
- **The Policy (The Visa):** This defines what that identity is allowed to do. Just because you have a valid passport doesn't mean you have a visa to enter every country. A policy ensures that even a verified identity can only access the specific resources it needs.

When these three pillars aren't managed together, security breaks down. You might have a valid Principal using a stolen Credential, or a legitimate identity with a Policy that is far too broad. 


    
      
## Leaked token detection


      [
        
      ](#leaked-token-detection)
    
    Agents and other third-party applications use API tokens to access the Cloudflare API. One of the simplest ways that we see people leaking their secrets is by accidentally pushing them to a public GitHub repository. [GitGuardian](https://www.gitguardian.com/files/the-state-of-secrets-sprawl-report-2026) reports that last year more than 28 million secrets were published to public GitHub repositories, and that AI is causing leaks to happen 5x faster than before.

If an API token is a digital passport, then leaking it on a public repository is like leaving your passport on a park bench. Anyone who finds it can impersonate that identity until the document is canceled. Our partnership with GitHub acts like a global "lost and found" for these credentials. By the time you realize your passport is missing, we’ve already identified the document, verified its authenticity via the checksum, and voided it to prevent misuse.

We’re partnering with several leading credential scanning tools to help proactively find your leaked tokens and revoke them before they could be used maliciously. We know it’s not a matter of if, but rather when, before you, an employee, or one of your agents makes a mistake and pushes a secret somewhere it shouldn’t be. 


    
      
#### GitHub


      [
        
      ](#github)
    
    We’ve partnered with GitHub and are participating in their Secret Scanning program to find your tokens in both public and private repositories. If we are notified that a token has leaked to a public repository, we will automatically revoke the token to prevent it from being used maliciously. For private repositories, GitHub will notify you about any leaked Cloudflare tokens and you can clean these up.


    
      
##### How it works


      [
        
      ](#how-it-works)
    
    We’ve shared the new token formats (below!) with GitHub, and they now scan for them on every commit. If they find something that looks like a leaked Cloudflare token, they verify the token is real (using the checksum), send us a webhook to revoke it, and then we notify you via email so you can generate a new one in Dashboard settings.

This means we plug the hole as soon as it’s found. By the time you realize you made a mistake, we've already fixed it. 

We hope this is the kind of feature you don’t need to use, but our partners are on the lookout for leaks to help keep you secure. 


    
      
#### Cloudflare One


      [
        
      ](#cloudflare-one)
    
    Cloudflare One customers are also protected from these leaks. By configuring the [Credentials and Secrets](https://developers.cloudflare.com/cloudflare-one/data-loss-prevention/dlp-profiles/predefined-profiles/#credentials-and-secrets) DLP profile, organizations can activate prevention everywhere a credential can travel:

- **Network Traffic (**[**Cloudflare Gateway**](https://www.cloudflare.com/sase/products/gateway/)**):** Apply these entries to a policy to detect and block Cloudflare API tokens moving across your network. A token in a file upload, an outbound request, or a download is stopped before it reaches its destination.
- **Outbound Email (**[**Cloudflare Email Security**](https://www.cloudflare.com/sase/products/email-security/)**):** Microsoft 365 customers can extend this same prevention to Outlook. The [DLP Assist](https://developers.cloudflare.com/cloudflare-one/email-security/outbound-dlp/) add-in scans messages before delivery, catching a token before it’s sent externally.
- **Data at Rest (**[**Cloudflare CASB**](https://www.cloudflare.com/sase/products/casb/)**):** Cloudflare’s Cloud Access Security Broker applies the same profile to scan files across connected SaaS applications, catching tokens saved or shared in Google Drive, OneDrive, Dropbox, and other integrated services.

The most novel exposure vector, though, is AI traffic. [Cloudflare AI Gateway](https://www.cloudflare.com/developer-platform/products/ai-gateway/) integrates with the same DLP profiles to scan and block both incoming prompts and outgoing AI model responses in real time.


    
      
#### Other credential scanners


      [
        
      ](#other-credential-scanners)
    
    The only way credential scanning works is if we meet you where you are, so we are working with several open source and commercial credential scanners to ensure you are protected no matter what secret scanner you use. 


    
      
### How it works


      [
        
      ](#how-it-works)
    
    Until now, Cloudflare’s API tokens were pretty generic looking, so they were hard for credential scanners to identify with high confidence. These automated security tools scan your code repositories looking for exposed credentials like API keys, tokens or passwords. The “cf” prefix makes Cloudflare tokens instantly recognizable with greater confidence, and the checksum makes it easy for tools to statically validate them. Your existing tokens will continue to work, but every new token you generate will use the scannable format so it’s easily detected with high confidence.

| Credential Type   | What it's for                                                 | New Format                     |
| ----------------- | ------------------------------------------------------------- | ------------------------------ |
| User API Key      | Legacy global API key tied to your user account (full access) | cfk_[40 characters][checksum]  |
| User API Token    | Scoped token you create for specific permissions              | cfut_[40 characters][checksum] |
| Account API Token | Token owned by the account (not a specific user)              | cfat_[40 characters][checksum] |


    
      
#### Getting started


      [
        
      ](#getting-started)
    
    If you have existing API tokens, you can roll the token to create a new, scannable API token. This is optional, but recommended to ensure that your tokens are easily discoverable in case they leak. 

While API tokens are generally used by your own scripts and agents, OAuth is how you manage access for third-party platforms. Both require clear visibility to prevent unauthorized access and ensure you know exactly who — or what — has access to your data.


    
      
## Improving the OAuth consent experience


      [
        
      ](#improving-the-oauth-consent-experience)
    
    When you connect third-party applications like Wrangler to your Cloudflare Account using OAuth, you're granting that application access to your account’s data. Over time, you may forget why you granted a third party application access to your Account in the first place. Previously, there was no central place to view & manage those applications. Starting today, there is.  

Going forward, when a third party application requests access to your Cloudflare account, you’ll be able to review: 

- **Which third-party application** is requesting access, along with information about the application like Name, Logo, and the Publisher.
- **Which scopes** the third-party application is requesting access to.
- **Which accounts** to grant the third party application access to.


| Before | After |
| ------ | ----- |
|        |       |

Not all applications require the same permissions; some only need to read data, others may need to make changes to your Account. Understanding these scopes before you grant access helps you maintain least-privilege. 

We also added a [Connected Applications](https://dash.cloudflare.com/profile/access-management/authorization) experience so you can see which applications have access to which accounts, what scopes/permissions are associated with that application, and easily revoke that access as needed. 


          ![BLOG-3216 5](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5Aiu82urkjaL9SWpZUBgNi/827cf38aa655d4094de1895d07f51137/BLOG-3216_5.png)


    
      
#### Getting started


      [
        
      ](#getting-started)
    
    The OAuth consent and revocation improvements are available now. Check which apps currently have access to your accounts by visiting My Profile > Access Management > Connected Applications. 

For developers building integrations with Cloudflare, keep an eye on the [Cloudflare Changelog](https://developers.cloudflare.com/changelog) for more announcements around how you can register your own OAuth apps soon! 


    
      
## Fine-grained resource-level permissioning


      [
        
      ](#fine-grained-resource-level-permissioning)
    
    If the token is the passport, then resource-scoped permissions are the visas inside it. Having a valid passport gets you through the front door, but it shouldn't give you access to every room in the building. By narrowing the scope to specific resources — like a single Load Balancer pool or a specific Gateway policy — you are ensuring that even if an identity is verified, it only has the "visa" to go where it’s strictly necessary.

Last year, we [announced](https://developers.cloudflare.com/changelog/post/2025-10-01-fine-grained-permissioning-beta/) support for resource scoped permissions in Cloudflare’s [role-based access control (RBAC)](https://www.cloudflare.com/learning/access-management/role-based-access-control-rbac/) system for several of our Zero Trust products. This enables you to right size permissions for both users and agents to minimize security risks. We’ve expanded this capability to several new resources-level permissions. The resource scope is now supported for:

- Access Applications
- Access Identity Providers
- Access Policies
- Access Service Tokens
- Access Targets

We’ve also completely overhauled the API Token creation experience, making it easier for customers to provision and manage Account API Tokens right from the Cloudflare Dashboard. 


          ![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2XSjOtE46g8iVNN7QNzoDI/2f2280b106da9ebc9f3959d5300a4241/account_owned_token_gif.gif)


    
      
#### How it works


      [
        
      ](#how-it-works)
    
    When you add a member to your Cloudflare account or create an API Token, you typically assign that principal a policy. A Permission Policy is what gives a principal permission to take an action, whether that’s managing Cloudflare One Access Applications, or DNS Records. Without a policy, a principal can authenticate, but they are unauthorized to do any actions within an account.

Policies are made up of three components: a Principal, a Role, and a Scope. The Principal is who or what you're granting access to, whether that's a human user, a Non-Human Identity (NHI) like an API Token, or increasingly, an Agent acting on behalf of a user. The Role defines what actions they're permitted to take. The Scope determines where those permissions apply, and historically, that's been restricted to the entire account, or individual zones.


    
      
## New permission roles


      [
        
      ](#new-permission-roles)
    
    We’re also expanding the role surface more broadly at both the Account & Zone level with the introduction of a number of new roles for many products.   

- Account scope

- CDN Management
- MCP Portals
- Radar
- Request Tracer
- SSL/TLS Management
- Zone scope

- Analytics
- Logpush
- Page Rules
- Security Center
- Snippets
- Zone Settings


    
      
#### Getting started


      [
        
      ](#getting-started)
    
    The resource scope and all new account and zone-level roles are available today for all Cloudflare customers. You can assign account, zone, or resource-scoped policies through the Cloudflare Dashboard, the API, or Terraform. 

For a full breakdown of all available roles and how scopes work, visit our [roles](https://developers.cloudflare.com/fundamentals/manage-members/roles/) and [scope documentation](https://developers.cloudflare.com/fundamentals/manage-members/scope/).


    
      
## Secure your accounts


      [
        
      ](#secure-your-accounts)
    
    These updates provide the granular building blocks needed for a true least-privilege architecture. By refining how we manage permissions and credentials, developers and enterprises can have greater confidence in their security posture across the users, apps, agents, and scripts that access Cloudflare. Least privilege isn’t a new concept, and for enterprises, it’s never been optional. Whether a human administrator is managing a zone or an agent is programmatically deploying a Worker, the expectation is the same, they should only be authorized to do the job it was given, and nothing else. 

Following today’s announcement, we recommend customers:

1. Review your [API tokens](https://dash.cloudflare.com/profile/api-tokens), and reissue with the new, scannable API tokens as soon as possible.
2. [Review your authorized OAuth apps](https://dash.cloudflare.com/profile/access-management/authorization), and revoke any that you are no longer using
3. Review [member](https://dash.cloudflare.com/?to=/:account/billing) & [API Token](https://dash.cloudflare.com/profile/api-tokens) permissions in your accounts and ensure that users are taking advantage of the new account, zone, or resource scoped permissions as needed to reduce your risk area.


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Security](/tag/security/)[Product News](/tag/product-news/)[Developers](/tag/developers/)[Developer Platform](/tag/developer-platform/)
