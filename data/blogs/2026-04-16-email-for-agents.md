---
title: "Cloudflare Email Service: now in public beta. Ready for your agents"
date: 2026-04-16
url: https://blog.cloudflare.com/email-for-agents/
authors: ["Thomas Gauvin", "Eric Falcão", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Cloudflare Email Service: now in public beta. Ready for your agents

By Thomas Gauvin, Eric Falcão, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-16


# Cloudflare Email Service: now in public beta. Ready for your agents

2026-04-16

- [![Thomas Gauvin](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2niktUqyQO5YzVIBCwrBGl/9474ec9faff3b27f7ec9013a066b9b54/Thomas_Gauvin.jpg)

](/author/thomas-gauvin/)[Thomas Gauvin](/author/thomas-gauvin/)
- [![Eric Falcão](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3JyuBDNArl9D7VaLtNvN5/f41c56567d54589f0499452cbdfb9c06/Eric_Falca%C3%8C_o.jpg)

](/author/eric-falcao/)[Eric Falcão](/author/eric-falcao/)

6 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1Qf637mptxRY4oxcvZhPi2/310c6583742e2b812a77e09c27340f70/BLOG-3210_1.png)

Email is the most accessible interface in the world. It is ubiquitous. There’s no need for a custom chat application, no custom SDK for each channel. Everyone already has an email address, which means everyone can already interact with your application or agent. And your agent can interact with anyone.

If you are building an application, you already rely on email for signups, notifications, and invoices. Increasingly, it is not just your application logic that needs this channel. Your agents do, too. During our private beta, we talked to developers who are building exactly this: customer support agents, invoice processing pipelines, account verification flows, multi-agent workflows. All built on top of email. The pattern is clear: email is becoming a core interface for agents, and developers need infrastructure purpose-built for it.

Cloudflare Email Service is that piece. With **Email Routing**, you can receive email to your application or agent. With **Email Sending,** you can reply to emails or send outbounds to notify your users when your agents are done doing work. And with the rest of the developer platform, you can build a full email client and [Agents SDK](https://blog.cloudflare.com/project-think/) onEmail hook as native functionality. 

Today, as part of Agents Week, Cloudflare Email Service is entering **public beta**, allowing any application and any agent to send emails. We are also completing the toolkit for building email-native agents: 

- Email Sending binding, available from your Workers and the Agents SDK
- A new Email MCP server
- Wrangler CLI email commands
- Skills for coding agents
- An open-source agentic inbox reference app


    
      
## Email Sending: now in public beta


      [
        
      ](#email-sending-now-in-public-beta)
    
    Email Sending graduates from private beta to **public beta **today. You can now send transactional emails directly from Workers with a native Workers binding — no API keys, no secrets management.


            
```javascript
export default {
  async fetch(request, env, ctx) {
    await env.EMAIL.send({
      to: "[email protected]",
      from: "[email protected]",
      subject: "Your order has shipped",
      text: "Your order #1234 has shipped and is on its way."
    });
    return new Response("Email sent");
  },
};

```


            Or send from any platform, any language, using the REST API and our TypeScript, Python, and Go SDKs:


            
```javascript
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/email-service/send" \
   --header "Authorization: Bearer <API_TOKEN>" \
   --header "Content-Type: application/json" \
   --data '{
     "to": "[email protected]",
     "from": "[email protected]",
     "subject": "Your order has shipped",
     "text": "Your order #1234 has shipped and is on its way."
   }'

```


            Sending email that actually reaches inboxes usually means wrestling with SPF, DKIM, and DMARC records. When you add your domain to Email Service, we configure all of it automatically. Your emails are authenticated and delivered, not flagged as spam. And because Email Service is a global service built on Cloudflare's network, your emails are delivered with low latency anywhere in the world.

Combined with [Email Routing](https://developers.cloudflare.com/email-routing/), which has been free and available for years, you now have complete bidirectional email within a single platform. Receive an email, process it in a Worker, and reply, all without leaving Cloudflare.

For the full deep dive on Email Sending, [refer to our Birthday Week announcement](https://blog.cloudflare.com/email-service/). The rest of this post describes what Email Service unlocks for agents.


    
      
## Agents SDK: your agent is email-native


      [
        
      ](#agents-sdk-your-agent-is-email-native)
    
    The Agents SDK for building agents on Cloudflare already has a first-class [onEmail hook](https://developers.cloudflare.com/agents/api-reference/agents-api/) for receiving and processing inbound email. But until now, your agent could only reply synchronously, or send emails to members of your Cloudflare account. 

With Email Sending, that constraint is gone. This is the difference between a chatbot and an agent.


          ![BLOG-3210 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4aGV0BVpbrj3ql5TubPMXx/b85351f13c5fae93a27d11e20a5fc11e/BLOG-3210_2.png)

*Email agents receive a message, orchestrate work across the platform, and respond asynchronously.*

A chatbot responds in the moment or not at all. An agent thinks, acts, and communicates on its own timeline. With Email Sending, your agent can receive a message, spend an hour processing data, check three other systems, and then reply with a complete answer. It can schedule follow-ups. It can escalate when it detects an edge case. It can operate independently. In other words: it can actually do work, not just answer questions. 

Here's what a support agent looks like with the full pipeline — receive, persist, and reply:


            
```javascript
import { Agent, routeAgentEmail } from "agents";
import { createAddressBasedEmailResolver, type AgentEmail } from "agents/email";
import PostalMime from "postal-mime";

export class SupportAgent extends Agent {
  async onEmail(email: AgentEmail) {
    const raw = await email.getRaw();
    const parsed = await PostalMime.parse(raw);

   // Persist in agent state
    this.setState({
      ...this.state,
      ticket: { from: email.from, subject: parsed.subject, body: parsed.text, messageId: parsed.messageId },
    });

    // Kick off long running background agent task 
    // Or place a message on a Queue to be handled by another Worker

    // Reply here or in other Worker handler, like a Queue handler
    await this.sendEmail({
      binding: this.env.EMAIL,
      fromName: "Support Agent",
      from: "[email protected]",
      to: this.state.ticket.from,
      inReplyTo: this.state.ticket.messageId,
      subject: `Re: ${this.state.ticket.subject}`,
      text: `Thanks for reaching out. We received your message about "${this.state.ticket.subject}" and will follow up shortly.`
    });
  }
}

export default {
  async email(message, env) {
    await routeAgentEmail(message, env, {
      resolver: createAddressBasedEmailResolver("SupportAgent"),
    });
  },
} satisfies ExportedHandler<Env>;
```


            If you're new to the Agents SDK's email capabilities, here's what's happening under the hood.

**Each agent gets its own identity from a single domain.** The address-based resolver routes [[email protected]](/cdn-cgi/l/email-protection) to a "support" agent instance, [[email protected]](/cdn-cgi/l/email-protection) to a "sales" instance, and so on. You don't need to provision separate inboxes — the routing is built into the address. You can even use sub-addressing ([[email protected]](/cdn-cgi/l/email-protection)) to route to different agent namespaces and instances.

**State persists across emails.** Because agents are backed by Durable Objects, calling this.setState() means your agent remembers conversation history, contact information, and context across sessions. The inbox becomes the agent's memory, without needing a separate database or vector store.

**Secure reply routing is built in.** When your agent sends an email and expects a reply, you can sign the routing headers with HMAC-SHA256 so that replies route back to the exact agent instance that sent the original message. This prevents attackers from forging headers to route emails to arbitrary agent instances — a security concern that most "email for agents" solutions haven't addressed.

This is the complete email agent pipeline that teams are building from scratch elsewhere: receive email, parse it, classify it, persist state, kick off async workflows, reply or escalate — all within a single Agent class, deployed globally on Cloudflare's network.


    
      
## Email tooling for your agents: MCP server, Wrangler CLI, and skills


      [
        
      ](#email-tooling-for-your-agents-mcp-server-wrangler-cli-and-skills)
    
    Email Service isn't only for agents running on Cloudflare. Agents run everywhere, whether it’s coding agents like Claude Code, Cursor, or Copilot running locally or in remote environments, or production agents running in containers or external clouds. They all need to send email from those environments. We're shipping three integrations that make Email Service accessible to any agent, regardless of where it runs.

Email is now available through the [Cloudflare MCP server](https://github.com/cloudflare/mcp), the same [Code Mode](https://blog.cloudflare.com/code-mode/)-powered server that gives agents access to the entire Cloudflare API. With this MCP server, your agent can discover and call the Email endpoints to send and configure emails. You can send an email with a simple prompt:


            
```unset
"Send me a notification email at [email protected] from my staging domain when the build completes"
```


            For agents running on a computer or a sandbox with bash access, the Wrangler CLI solves the MCP context window problem that we discussed in the [Code Mode](https://blog.cloudflare.com/code-mode/) blog post — tool definitions can consume tens of thousands of tokens before your agent even starts processing a single message. With Wrangler, your agent starts with near-zero context overhead and discovers capabilities on demand through `--help` commands. Here is how your agent can send an email via Wrangler:


            
```javascript
wrangler email send \
  --to "[email protected]" \
  --from "[email protected]" \
  --subject "Build completed" \
  --text "The build passed. Deployed to staging."

```


            Regardless of whether you give your agent the Cloudflare MCP or the Wrangler CLI, your agent will be able to now send emails on your behalf with just a prompt.


    
      
### Skills


      [
        
      ](#skills)
    
    We are also publishing a [Cloudflare Email Service skill](https://github.com/cloudflare/skills). It gives your agents complete guidance: configuring the Workers binding, sending emails via the REST API or SDKs, handling inbound email with Email Routing configuration, building with Agents SDK, and managing email through Wrangler CLI or MCP. It also covers deliverability best practices and how to craft good transactional emails that land in inboxes rather than spam. Drop it into your project and your coding agent has everything needed to build production-ready email on Cloudflare.


    
      
## Open-sourcing tools for email agents


      [
        
      ](#open-sourcing-tools-for-email-agents)
    
    During the private beta, we also experimented with email agents. It became clear that you often want to keep the human-in-the-loop element to review emails and see what the agent is doing.The best way to do that is to have a fully featured email client with agent automations built-in.

That’s why we built [Agentic Inbox](https://github.com/cloudflare/agentic-inbox): a reference application with full conversation threading, email rendering, receiving and storing emails and their attachments, and automatically replying to emails. It includes a dedicated MCP server built-in, so external agents can draft emails for your review before sending from your agentic-inbox. 


          ![BLOG-3210 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4PgrSXLUD5kgA2SFOhksCS/75f85353cf710842420ed806be31b6f6/BLOG-3210_3.png)

We’re [open-sourcing Agentic Inbox](https://github.com/cloudflare/agentic-inbox) as a reference application for how to build a full email application using Email Routing for inbound, Email Sending for outbound, Workers AI for classification, R2 for attachments, and Agents SDK for stateful agent logic. You can deploy it today to get a full inbox, email client and agent for your emails, with the click of a button.

We want email agent tooling to be composable and reusable. Rather than every team rebuilding the same inbound-classify-reply pipeline, start with this reference application. Fork it, extend it, use it as a starting point for your own email agents that fit your workflows.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)

](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/agentic-inbox)


    
      
## Try it out today


      [
        
      ](#try-it-out-today)
    
    Email is where the world’s most important workflows live, but for agents, it has often been a difficult channel to reach. With **Email Sending** now in public beta, Cloudflare Email Service becomes a complete platform for bidirectional communication, making the inbox a first-class interface for your agents.

Whether you’re building a support agent that meets customers in their inbox or a background process that keeps your team updated in real time, your agents now have a seamless way to communicate on a global scale. The inbox is no longer a silo. Now it’s one more place for your agents to be helpful.

- Try out [Email Sending in the Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/email-service/sending)
- Read the [Email Service documentation](https://developers.cloudflare.com/email-service/)
- Follow the [Agents SDK email docs](https://developers.cloudflare.com/agents/api-reference/email)
- Check out the [Email Service MCP server](https://github.com/cloudflare/mcp-server-cloudflare) and [Skills](https://github.com/cloudflare/skills)
- [Deploy the open-source reference app](https://github.com/cloudflare/agentic-inbox)


          ![BLOG-3210 5](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2YaSov283la8ajbi0Sbprq/9108f26b499fd976470a79ee74034e59/BLOG-3210_5.png)


    
      
## Watch on Cloudflare TV


      [
        
      ](#watch-on-cloudflare-tv)
    
    
  


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Developers](/tag/developers/)[Developer Platform](/tag/developer-platform/)[AI](/tag/ai/)[Workers AI](/tag/workers-ai/)[Email](/tag/email/)
