---
title: "Rearchitecting the Workflows control plane for the agentic era"
date: 2026-04-15
url: https://blog.cloudflare.com/workflows-v2/
authors: ["Luís Duarte", "Mia Malden", "André Venceslau", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Rearchitecting the Workflows control plane for the agentic era

By Luís Duarte, Mia Malden, André Venceslau, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-15


# Rearchitecting the Workflows control plane for the agentic era

2026-04-15

- [![Luís Duarte](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/54m6CsAMjVSgHApo4U4dl8/dcc811c066b764405d1f0c97f7da7898/6b4ed68c-9716-43c9-be81-2093d9848338_800x800.png)

](/author/luis-duarte/)[Luís Duarte](/author/luis-duarte/)
- [![Mia Malden](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2FY6694OH0p4nMADqEeg6b/49113dde85b295765b541197294fe244/Mia_Malden.jpg)

](/author/mia/)[Mia Malden](/author/mia/)
- [![André Venceslau](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3Aj0RF6kebqiWYLfi9rbgR/787c46c89cbcf7c9f6242074985d7091/Andre%C3%8C__Venceslau.png)

](/author/andre-venceslau/)[André Venceslau](/author/andre-venceslau/)

8 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3RVbbRxnAMmyQiLMSfOsTp/0bc05e7cbde7a55919fdee642ef892ad/BLOG-3116_1.png)

When we originally built [Workflows](https://developers.cloudflare.com/workflows/), our durable execution engine for multi-step applications, it was designed for a world in which workflows were triggered by human actions, like a user signing up or placing an order. For use cases like onboarding flows, workflows only had to support one instance per person — and people can only click so fast. 

Over time, what we’ve actually seen is a quantitative shift in the workload and access pattern: fewer human-triggered workflows, and more agent-triggered workflows, created at machine speed. 

As agents become persistent and autonomous infrastructure, operating on behalf of users for hours or days, they need a durable, asynchronous execution engine for the work they are doing. Workflows provides exactly that: every step is independently retryable, the workflow can pause for human-in-the-loop approval, and each instance survives failures without losing progress.  

Moreover, workflows themselves are being used to implement agent loops and serve as the durable harnesses that manage and keep agents alive. Our[ Agents SDK integration](https://developers.cloudflare.com/changelog/post/2026-02-03-agents-workflows-integration/) accelerated this, making it easy for agents to spawn workflow instances and get real-time progress back. A single agent session can now kick off dozens of workflows, and many agents running concurrently means thousands of instances created in seconds. With [Project Think](https://blog.cloudflare.com/project-think) now available, we anticipate that velocity will only increase.

To help developers scale their agents and applications on Workflows, we are excited to announce that we now support:

- 50,000 concurrent instances (number of workflow executions running in parallel), [originally 4,500](https://developers.cloudflare.com/changelog/post/2025-02-25-workflows-concurrency-increased/)
- 300 instances/second created per account, previously 100
- 2 million queued instances (meaning instances that have been created or awoken and are waiting for a concurrency slot) per workflow, up from 1 million

We redesigned the Workflows control plane from usage data and first principles to support these increases. For V1 of the control plane, a single Durable Object (DO) could serve as the central registry and coordinator of an entire account. For V2, we built two new components to help horizontally scale the system and alleviate the bottlenecks that V1 introduced, before migrating all customers — with live traffic — seamlessly onto the new version.


    
      
## V1: initial architecture of Workflows


      [
        
      ](#v1-initial-architecture-of-workflows)
    
    As described in our [public beta blog post](https://blog.cloudflare.com/building-workflows-durable-execution-on-workers/#building-cloudflare-on-cloudflare), we built [Workflows](https://www.cloudflare.com/developer-platform/products/workflows/) entirely on our own developer platform. Fundamentally, a workflow is a series of durable steps, each independently retryable, that can execute tasks, wait for external events, or sleep until a predetermined time. 


            
```javascript
export class MyWorkflow extends WorkflowEntrypoint {

  async run(event, step) {
    const data = await step.do("fetch-data", async () => {
      return fetchFromAPI();
    });

    const approval = await step.waitForEvent("approval", {
      type: "approval",
      timeout: "24 hours",
    });

    await step.do("process-and-save", async () => {
      return store(transform(data));
    });
  }
}

```


            To trigger each instance, execute its logic, and store its metadata, we leverage SQLite-backed [Durable Objects](https://www.cloudflare.com/developer-platform/products/durable-objects/), which are a simple but powerful primitive for coordination and storage within a distributed system. 

In the control plane, some Durable Objects — like the *Engine*, which executes the actual workflow instance, including its step, retry, and sleep logic — are spun up at a ratio of 1:1 per instance. On the other hand, the *Account* is an account-level Durable Object that manages all workflows and workflow instances for that account.


          ![BLOG-3116 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/55bqaUjc30HJHe9spWYTo8/d8053955660553db8b64a484fb321ec7/BLOG-3116_2.png)

To learn more about the V1 control plane, refer to our [Workflows announcement blog post](https://blog.cloudflare.com/building-workflows-durable-execution-on-workers/).

After we launched Workflows into beta, we were thrilled to see customers quickly scaling their use of the product, but we also realized that having a single Durable Object to store all that account-level information introduced a bottleneck. Many customers needed to create and execute hundreds or even thousands of Workflow instances per minute, which could quickly overwhelm the *Account* in our original architecture. The original rate limits — 4,500 concurrency slots and 100 instance creations per 10 seconds — were a result of this limitation. 

On the V1 control plane, these limits were a hard cap. Any and all operations depending on *Account*, including create, update, and list, had to go through that single DO. Users with high concurrency workloads could have thousands of instances starting and ending at any given moment, building up to thousands of requests per second to *Account*. To solve for this, we rearchitected the workflow control plane such that it horizontally scales to higher concurrency and creation rate limits. 


    
      
## V2: horizontal scale for higher throughput


      [
        
      ](#v2-horizontal-scale-for-higher-throughput)
    
    For the new version, we rethought every single operation from the ground up with the goal of optimizing for high-volume workflows. Ultimately, Workflows should scale to support whatever developers need – whether that is thousands of instances created per second or millions of instances running at a time. We also wanted to ensure that V2 allowed for flexible limits, which we can toggle and continue increasing, rather than the hard cap which V1 limits imposed. After many design iterations, we settled on the following pillars for our new architecture: 

- The source of truth for the existence of a given instance should be its *Engine* and nothing else. 

- In the V1 control plane architecture, we lacked a check before queuing the instance as to whether its *Engine* actually existed. This allowed for a bad state where an instance may have been queued without its corresponding *Engine *having spun up.
- Instance lifecycle and liveness mechanisms must be horizontally scalable per-workflow and distributed throughout many regions.
- The new Account singleton should only store the minimum necessary metadata and have an invariant maximum amount of concurrent requests.


          ![BLOG-3116 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1txhhObwwIcV8C2gr9Hjfe/df7ea739567c7e42471458357c16583d/unnamed.png)

There are two new, critical components in the V2 control plane which allowed us to improve the scalability of Workflows: *SousChef* and *Gatekeeper*. The first component, *SousChef*, is a “second in command” to the *Account*. Recall that previously, the *Account* managed the metadata and lifecycle for all of the instances across all of the workflows within a given account. *SousChef* was introduced to keep track of metadata and lifecycle on a **subset** of instances in a given workflow. Within an account, a distribution of *SousChefs* can then report back to *Account* in a more efficient and manageable way. (An added benefit of this design: not only did we already have per-account isolation, but we also inadvertently gained “per-workflow” isolation within the same account, since each *SousChef* only takes care of one specific workflow).

The second component, *Gatekeeper*, is a mechanism to distribute concurrency “slots” (derived from concurrency limits) across all *SousChefs* within the account. It acts as a leasing system. When an instance is created, it is randomly assigned to one of the *SousChefs* within that account. Then the *SousChef* makes a request to *Account* to trigger that instance. Either a slot is granted, or the instance is queued. Once the slot is granted, the *SousChef* triggers execution of the instance and assumes responsibility that the instance never gets stuck. 

*Gatekeeper* was needed to make sure that *Engines* never overloaded their *Account* (a pressing risk on V1) so every communication between *SousChefs* and their *Account* happens on a periodic cycle, once per second — each cycle will also batch all slot requests, ensuring that only one JSRPC call is made. This ensures the instance creation rate can never overload or influence the most important component, *Account* (as an aside: if the *SousChef *count is too high, we rate-limit calls or spread across different *SousChefs* throughout different time periods). Also, this periodic property allows us to preserve fairness on older instances and to ensure max-min fairness through the many *SousChefs*, allowing them all to progress. For example, if an instance wakes up, it should be prioritized for a slot over a newly created instance, but each *SousChef* ensures that its own instances do not get stuck.

This architecture is more distributed, and therefore, more scalable. Now, when an instance is created, the request path is:

1. Check control plane version
2. Check if a cached version of the workflow and version details is available in that location

1. If not, check *Account* to get workflow name, unique ID, and version, and cache that information
3. Store only necessary metadata (instance payload, creation date) onto its own *Engine*

So, how does *Engine* tell the control plane that it now exists? That happens in the background after instance metadata is set. As background operations on a Durable Object can fail, due to eviction or server failure, we also set an “alarm” on *Engine* in the creation hot-path. That way, if the background task does not finish, the alarm **ensures** that the instance will begin. 

A [Durable Object alarm](https://developers.cloudflare.com/durable-objects/api/alarms/) allows a Durable Object instance to be awakened at a fine-grained time in the future with an** at-least-once **execution model, with automatic retries built in. We extensively use this combination of background “tasks” and alarms to remove operations off the hot-path while still ensuring that everything will happen as planned. That’s how we keep critical operations like *creating an instance* fast without ever compromising on reliability. 

Other than unlocking scale, this version of the control plane means that: 

- Instance listing performance is faster, and actually consistent with cursor pagination;
- Any operation on an instance does exactly one network hop (as it can go directly to its *Engine*, ensuring that eyeball request latency is as small as we can manage);
- We can ensure that more instances are actually behaving correctly (by running on time) concurrently (and correct them if not, making sure that *Engines* are never late to continue execution).


    
      
## V1 → V2 migration


      [
        
      ](#v1-v2-migration)
    
    Now that we had a new version of the Workflows control plane that can handle a higher volume of user load, we needed to do the “boring” part: migrating our customers and instances to the new system. At Cloudflare’s scale, this becomes a problem in and of itself, so the “boring” part becomes the biggest challenge. Well before its one-year mark, Workflows had already racked up millions of instances and thousands of customers. Also, some tech debt on V1’s control plane meant that a queued instance might not have its own *Engine* Durable Object created yet, complicating matters further.

Such a migration is tricky because customers might have instances running at any given moment; we needed a way to add the *SousChef* and *Gatekeeper* components into older accounts without causing any disruption or downtime.

We ultimately decided that we would migrate existing *Accounts *(which we’ll refer to as *AccountOlds) *to behave like *SousChefs. *By persisting the *Account* DOs, we maintained the instance metadata, and simply converted the DO into a *SousChef* “DO”: 


            
```JavaScript
// You might be wondering what's this SousChef class? This is the SousChef DO class!
import { SousChef } from "@repo/souschef";

class AccountOld extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    // We added the following snippet to the end of our AccountOld DO's
    // constructor. This ensures that if we want, we can use any primitive
    // that is available on SousChef DO
    if (this.currentVersion === ControlPlaneVersions.SOUS_CHEFS) {
      this.sousChef = new SousChef(this.ctx, this.env);
      await this.sousChef.setup()
    }
  }

  async updateInstance(params: UpdateInstanceParams) {
    if (this.currentVersion === ControlPlaneVersions.SOUS_CHEFS) {
      assert(this.sousChef !== undefined, 'SousChef must exist on v2');
      return this.sousChef.updateInstance(params);
    }

    // old logic remains the same
  }

  @RequiresVersion<AccountOld>(ControlPlaneVersions.V1)
  async getMetadata() {
    // this method can only be run if 
    // this.currentVersion === ControlPlaneVersions.V1
  }
}
```


            We can instantiate the *SousChef* class within the *AccountOld* because the SQL tables that track instance metadata, on both *SousChefs* and *AccountOld* DOs, are the same on both. As such, we could just decide which version of the code to use. If this hadn’t been the case, we would have been forced to migrate the metadata of millions of instances, which would have made the migration more difficult and longer running for each account. So, how did the migration work?

First, we prepared *AccountOld* DOs to be switched to behave as *SousChefs* (which meant creating a release with a version of the snippet above). Then, we enabled control plane V2 per account, which triggered the next three steps roughly at the same time:

- All new instance creation requests are now routed to the new *SousChefs* (*SousChefs* are created when they receive the first request), new instances never go to *AccountOld* again;
- *AccountOld* DOs start migrating themselves to behave like *SousChefs*;
- The new *Account* DO is spun up with the corresponding metadata.

After all accounts were migrated to the new control plane version, we were able to sunset *AccountOld* DOs as their instance retention periods expired. Once all instances on all accounts on *AccountOlds* were migrated, we could spin down those DOs permanently. The migration was completed with no downtime in a process that truly felt like changing a car’s wheels while driving.


    
      
## Try it out


      [
        
      ](#try-it-out)
    
    If you are new to Workflows, try our [Get Started guide](https://developers.cloudflare.com/workflows/get-started/guide/) or [build your first durable agent](https://developers.cloudflare.com/workflows/get-started/durable-agents/) with Workflows.

If your use case requires higher limits than our new defaults — a concurrency limit of 50,000 slots and account-level creation rate limit of 300 instances per second, 100 per workflow — reach out via your account team or the [Workers Limit Request Form](https://forms.gle/ukpeZVLWLnKeixDu7). You can also reach out with feedback, feature requests, or just to share how you are using Workflows on our [Discord server](https://discord.com/channels/595317990191398933/1296923707792560189).

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[Durable Objects](/tag/durable-objects/)[Cloudflare Workers](/tag/workers/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)
