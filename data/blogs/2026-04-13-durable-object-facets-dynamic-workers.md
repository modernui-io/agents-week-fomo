---
title: "Durable Objects in Dynamic Workers: Give each AI-generated app its own database"
date: 2026-04-13
url: https://blog.cloudflare.com/durable-object-facets-dynamic-workers/
authors: ["Kenton Varda", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Durable Objects in Dynamic Workers: Give each AI-generated app its own database

By Kenton Varda, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-13


# Durable Objects in Dynamic Workers: Give each AI-generated app its own database

2026-04-13

- [![Kenton Varda](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1FFs4T2j1RyvxasKOkkdtP/e7bd05ce89c560a545853000a25da9bc/kenton-varda.jpg)

](/author/kenton-varda/)[Kenton Varda](/author/kenton-varda/)

4 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1DtVLberu9niPYikyiQ9wn/a3f8f279251e36bca9f96f2b73937d0a/Multifaceted_Durable_Objects.png)

A few weeks ago, we announced [Dynamic Workers](https://blog.cloudflare.com/dynamic-workers/), a new feature of the Workers platform which lets you load Worker code on-the-fly into a secure sandbox. The Dynamic Worker Loader API essentially provides direct access to the basic compute isolation primitive that Workers has been based on all along: isolates, not containers. Isolates are much lighter-weight than containers, and as such, can load 100x faster using 1/10 the memory. They are so efficient, they can be treated as "disposable": start one up to run a few lines of code, then throw it away. Like a secure version of eval(). 

Dynamic Workers have many uses. In the original announcement, we focused on how to use them to run AI-agent-generated code as an alternative to tool calls. In this use case, an AI agent performs actions at the request of a user by writing a few lines of code and executing them. The code is single-use, intended to perform one task one time, and is thrown away immediately after it executes.

But what if you want an AI to generate more persistent code? What if you want your AI to build a small application with a custom UI the user can interact with? What if you want that application to have long-lived state? But of course, you still want it to run in a secure sandbox.

One way to do this would be to use Dynamic Workers, and simply provide the Worker with an [RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/) API that gives it access to storage. Using [bindings](https://developers.cloudflare.com/dynamic-workers/usage/bindings/), you could give the Dynamic Worker an API that points back to your remote SQL database (perhaps backed by [Cloudflare D1](https://developers.cloudflare.com/d1/), or a Postgres database you access through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) — it's up to you).

But Workers also has a unique and extremely fast type of storage that may be a perfect fit for this use case: [Durable Objects](https://developers.cloudflare.com/durable-objects/). A Durable Object is a special kind of Worker that has a unique name, with one instance globally per name. That instance has a SQLite database attached, which lives *on local disk* on the machine where the Durable Object runs. This makes storage access ridiculously fast: there is effectively [zero latency](https://blog.cloudflare.com/sqlite-in-durable-objects/).

Perhaps, then, what you really want is for your AI to write code for a Durable Object, and then you want to run that code in a Dynamic Worker.


    
      
## But how?


      [
        
      ](#but-how)
    
    This presents a weird problem. Normally, to use Durable Objects you have to:

1. Write a class extending `DurableObject`.
2. Export it from your Worker's main module.
3. [Specify in your Wrangler config](https://developers.cloudflare.com/durable-objects/get-started/#5-configure-durable-object-class-with-sqlite-storage-backend) that storage should be provision for this class. This creates a Durable Object namespace that points at your class for handling incoming requests.
4. [Declare a Durable Object namespace binding](https://developers.cloudflare.com/durable-objects/get-started/#4-configure-durable-object-bindings) pointing at your namespace (or use [ctx.exports](https://developers.cloudflare.com/workers/runtime-apis/context/#exports)), and use it to make requests to your Durable Object.

This doesn't extend naturally to Dynamic Workers. First, there is the obvious problem: The code is dynamic. You run it without invoking the Cloudflare API at all. But Durable Object storage has to be provisioned through the API, and the namespace has to point at an implementing class. It can't point at your Dynamic Worker.

But there is a deeper problem: Even if you could somehow configure a Durable Object namespace to point directly at a Dynamic Worker, would you want to? Do you want your agent (or user) to be able to create a whole namespace full of Durable Objects? To use unlimited storage spread around the world?

You probably don't. You probably want some control. You may want to limit, or at least track, how many objects they create. Maybe you want to limit them to just one object (probably good enough for vibe-coded personal apps). You may want to add logging and other observability. Metrics. Billing. Etc.

To do all this, what you really want is for requests to these Durable Objects to go to *your* code *first*, where you can then do all the "logistics", and *then* forward the request into the agent's code. You want to write a *supervisor* that runs as part of every Durable Object.


    
      
## Solution: Durable Object Facets


      [
        
      ](#solution-durable-object-facets)
    
    Today we are releasing, in open beta, a feature that solves this problem.


          ![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/mUUk7svflWvIp5Ff3npbG/cd2ec9a7111681657c37e3560fd9af58/BLOG-3211_2.png)

[Durable Object Facets](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/) allow you to load and instantiate a Durable Object class dynamically, while providing it with a SQLite database to use for storage. With Facets:

- First you create a normal Durable Object namespace, pointing to a class *you* write.
- In that class, you load the agent's code as a Dynamic Worker, and call into it.
- The Dynamic Worker's code can implement a Durable Object class directly. That is, it literally exports a class declared as `extends DurableObject`.
- You are instantiating that class as a "facet" of your own Durable Object.
- The facet gets its own SQLite database, which it can use via the normal Durable Object storage APIs. This database is separate from the supervisor's database, but the two are stored together as part of the same overall Durable Object.


    
      
## How it works


      [
        
      ](#how-it-works)
    
    Here is a simple, complete implementation of an app platform that dynamically loads and runs a Durable Object class:


            
```javascript
import { DurableObject } from "cloudflare:workers";

// For the purpose of this example, we'll use this static
// application code, but in the real world this might be generated
// by AI (or even, perhaps, a human user).
const AGENT_CODE = `
  import { DurableObject } from "cloudflare:workers";

  // Simple app that remembers how many times it has been invoked
  // and returns it.
  export class App extends DurableObject {
    fetch(request) {
      // We use storage.kv here for simplicity, but storage.sql is
      // also available. Both are backed by SQLite.
      let counter = this.ctx.storage.kv.get("counter") || 0;
      ++counter;
      this.ctx.storage.kv.put("counter", counter);

      return new Response("You've made " + counter + " requests.\\n");
    }
  }
`;

// AppRunner is a Durable Object you write that is responsible for
// dynamically loading applications and delivering requests to them.
// Each instance of AppRunner contains a different app.
export class AppRunner extends DurableObject {
  async fetch(request) {
    // We've received an HTTP request, which we want to forward into
    // the app.

    // The app itself runs as a child facet named "app". One Durable
    // Object can have any number of facets (subject to storage limits)
    // with different names, but in this case we have only one. Call
    // this.ctx.facets.get() to get a stub pointing to it.
    let facet = this.ctx.facets.get("app", async () => {
      // If this callback is called, it means the facet hasn't
      // started yet (or has hibernated). In this callback, we can
      // tell the system what code we want it to load.

      // Load the Dynamic Worker.
      let worker = this.#loadDynamicWorker();

      // Get the exported class we're interested in.
      let appClass = worker.getDurableObjectClass("App");

      return { class: appClass };
    });

    // Forward request to the facet.
    // (Alternatively, you could call RPC methods here.)
    return await facet.fetch(request);
  }

  // RPC method that a client can call to set the dynamic code
  // for this app.
  setCode(code) {
    // Store the code in the AppRunner's SQLite storage.
    // Each unique code must have a unique ID to pass to the
    // Dynamic Worker Loader API, so we generate one randomly.
    this.ctx.storage.kv.put("codeId", crypto.randomUUID());
    this.ctx.storage.kv.put("code", code);
  }

  #loadDynamicWorker() {
    // Use the Dynamic Worker Loader API like normal. Use get()
    // rather than load() since we may load the same Worker many
    // times.
    let codeId = this.ctx.storage.kv.get("codeId");
    return this.env.LOADER.get(codeId, async () => {
      // This Worker hasn't been loaded yet. Load its code from
      // our own storage.
      let code = this.ctx.storage.kv.get("code");

      return {
        compatibilityDate: "2026-04-01",
        mainModule: "worker.js",
        modules: { "worker.js": code },
        globalOutbound: null,  // block network access
      }
    });
  }
}

// This is a simple Workers HTTP handler that uses AppRunner.
export default {
  async fetch(req, env, ctx) {
    // Get the instance of AppRunner named "my-app".
    // (Each name has exactly one Durable Object instance in the
    // world.)
    let obj = ctx.exports.AppRunner.getByName("my-app");

    // Initialize it with code. (In a real use case, you'd only
    // want to call this once, not on every request.)
    await obj.setCode(AGENT_CODE);

    // Forward the request to it.
    return await obj.fetch(req);
  }
}

```


            In this example:

- `AppRunner` is a "normal" Durable Object written by the platform developer (you).
- Each instance of `AppRunner` manages one application. It stores the app code and loads it on demand.
- The application itself implements and exports a Durable Object class, which the platform expects is named `App`.
- `AppRunner` loads the application code using Dynamic Workers, and then executes the code as a Durable Object Facet.
- Each instance of `AppRunner` is one Durable Object composed of *two* SQLite databases: one belonging to the parent (`AppRunner` itself) and one belonging to the facet (`App`). These databases are isolated: the application cannot read `AppRunner`'s database, only its own.

To run the example, copy the code above into a file `worker.j`s, pair it with the following `wrangler.jsonc`, and run it locally with `npx wrangler dev`.


            
```JSON
// wrangler.jsonc for the above sample worker.
{
  "compatibility_date": "2026-04-01",
  "main": "worker.js",
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": [
        "AppRunner"
      ]
    }
  ],
  "worker_loaders": [
    {
      "binding": "LOADER",
    },
  ],
}

```


            
    
      
## Start building


      [
        
      ](#start-building)
    
    Facets are a feature of Dynamic Workers, available in beta immediately to users on the Workers Paid plan.

Check out the documentation to learn more about [Dynamic Workers](https://developers.cloudflare.com/dynamic-workers/) and [Facets](https://developers.cloudflare.com/dynamic-workers/usage/durable-object-facets/).

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)[Agents Week](/tag/agents-week/)[Cloudflare Workers](/tag/workers/)[Durable Objects](/tag/durable-objects/)[Storage](/tag/storage/)
