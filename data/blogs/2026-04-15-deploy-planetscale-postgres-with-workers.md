---
title: "Deploy Postgres and MySQL databases with PlanetScale + Workers"
date: 2026-04-15
url: https://blog.cloudflare.com/deploy-planetscale-postgres-with-workers/
authors: ["Vy Ton", "Matt Silverlock", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Dillon Mulroy", "Matt Carey", "Thomas Gauvin", "Eric Falcão"]
---

# Deploy Postgres and MySQL databases with PlanetScale + Workers

By Vy Ton, Matt Silverlock, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Dillon Mulroy, Matt Carey, Thomas Gauvin, Eric Falcão | 2026-04-15


# Deploy Postgres and MySQL databases with PlanetScale + Workers

2026-04-16

- [![Vy Ton](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/47vp9vXZx8EXsnBFmCK8NS/2f7f46cdadaa4545e2b61d9c674d1e5a/vy.png)

](/author/vy/)[Vy Ton](/author/vy/)
- [![Matt Silverlock](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/7xP5qePZD9eyVtwIesXYxh/e714aaa573161ec9eb48d59bd1aa6225/silverlock.jpeg)

](/author/silverlock/)[Matt Silverlock](/author/silverlock/)

3 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/VPnsUenQnhvHyp33AcXzw/2534f3fec82d50f173b2bda35cf161a5/BLOG-3213_1.png)

Cloudflare announced our PlanetScale partnership last September to give [Cloudflare Workers](https://workers.cloudflare.com/) direct access to Postgres and MySQL databases for fast, full-stack applications.

Soon, we’re bringing our technologies even closer: you’ll be able to create PlanetScale Postgres and MySQL databases directly from the Cloudflare dashboard and API, and have them billed to your Cloudflare account. 


          ![BLOG-3213 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5Tj4gJrV5hxlIWxlmoXVZe/7661c1e47c0c868b88301b5f4aca4441/BLOG-3213_2.png)

You choose the data storage that fits your Worker application needs and keep a single system for billing as a Cloudflare self-serve or enterprise customer. Cloudflare credits like those given in our [startup program](https://www.cloudflare.com/forstartups/) or Cloudflare committed spend can be used towards PlanetScale databases.


    
      
## Postgres & MySQL for Workers


      [
        
      ](#postgres-mysql-for-workers)
    
    SQL relational databases like Postgres and MySQL are a foundation of modern applications. In particular, Postgres has risen in developer popularity with its rich tooling ecosystem (ORMs, GUIs, etc) and extensions like [pgvector](https://github.com/pgvector/pgvector/) for building vector search in AI-driven applications. Postgres is the default choice for most developers who need a powerful, flexible, and scalable database to power their applications.

You can already connect your PlanetScale account and create Postgres databases directly from the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/workers/hyperdrive?modal=1) for your Workers. Starting next month, a new Cloudflare subscription will bill for new PlanetScale databases direct to your Cloudflare account as a self-serve or enterprise user.


          ![BLOG-3213 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1CHTq1qoaNGSNO5atsiS8J/a8eba618b77362aa467d94c4f625c600/BLOG-3213_3.png)

*How to create PlanetScale databases via *[*Cloudflare dashboard*](https://dash.cloudflare.com/?to=/:account/workers/hyperdrive?modal=1)* after your PlanetScale account is connected. Cloudflare billing is coming next month.*

With our built-in integration, PlanetScale databases automatically work with Workers using Hyperdrive, our database connectivity service. [Hyperdrive](https://blog.cloudflare.com/how-hyperdrive-speeds-up-database-access/) service manages database connection pools and query caching to make database queries fast and reliable. You just add a [binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/) to your Worker’s [config file](https://developers.cloudflare.com/workers/wrangler/configuration/#hyperdrive): 


            
```javascript
// wrangler.jsonc file
{
  "hyperdrive": [
    {
      "binding": "DATABASE",
      "id": <AUTO_CREATED_ID>
    }
  ]
}

```


            And start running SQL queries via your Worker with your Postgres client of choice:


            
```javascript
import { Client } from "pg";

export default {
  async fetch(request, env, ctx) {
   
    const client = new Client({ connectionString: env.DATABASE.connectionString });
    await client.connect();

    const result = await client.query("SELECT * FROM pg_tables");
    ...
}

```


            
    
      
## PlanetScale developer experience


      [
        
      ](#planetscale-developer-experience)
    
    PlanetScale was the obvious choice to provide to the Workers community due to it’s unrivaled performance and reliability. Developers can choose from two of the most popular relational databases [with Postgres](https://planetscale.com/docs/postgres/postgres-compatibility) or Vitess MySQL. PlanetScale matches how Cloudflare treats performance and reliability as key features of a developer platform. And with features like [query insights](https://planetscale.com/docs/postgres/monitoring/query-insights) and [agent driven](https://planetscale.com/docs/connect/ai-tooling) workflows for improving SQL query performance and [branching](https://planetscale.com/docs/postgres/branching) for deploying code safely, including database changes, the PlanetScale database developer experience is first-class.

Cloudflare users get the exact same PlanetScale database developer experience. Your PlanetScale databases can be deployed directly from Cloudflare with connections managed via Hyperdrive, which already makes your existing regional databases fast with global Workers. This means access to the same PlanetScale [database clusters](https://planetscale.com/docs/plans/planetscale-skus) at standard PlanetScale [pricing](https://planetscale.com/pricing) with all features included like query insights and detailed breakdown of [usage and costs](https://planetscale.com/docs/billing#organization-usage-and-billing-page).


          ![BLOG-3213 4](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2Pfh4oM8zQSUGJKGEsxF3W/700f627c38279d9d90337b38de72b44e/BLOG-3213_4.png)

*A single node on PlanetScale Postgres starts at *[*$5/month*](https://planetscale.com/blog/5-dollar-planetscale)*.*


    
      
## Workers placement


      [
        
      ](#workers-placement)
    
    With centralized databases, Workers can run right next to your primary database to reduce latency with an [explicit placement hint](https://developers.cloudflare.com/workers/configuration/placement/#configure-explicit-placement-hints). By default, Workers execute closest to a user request, which adds network latency when querying a central database especially for multiple queries. Instead, you can configure your Worker to execute in the closest Cloudflare data center to your PlanetScale database. In the future, Cloudflare can automatically set a placement hint based on the location of your PlanetScale database and reduce network latency to single digit milliseconds.


            
```javascript
{
  "placement": {
    "region": "aws:us-east-1"
  }
}

```


            
    
      
## Coming soon


      [
        
      ](#coming-soon)
    
    You can deploy a PlanetScale Postgres database or connect an existing PlanetScale database to Workers today via the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/workers/hyperdrive?modal=1). Everything today is still billed via PlanetScale.

Launching next month, new PlanetScale databases can be billed to your Cloudflare account. 

We are building more with our PlanetScale partners, such as Cloudflare API integration, so tell us what you’d like to see next.

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [SQL](/tag/sql/)[Database](/tag/database/)[Storage](/tag/storage/)[Postgres](/tag/postgres/)[MySQL](/tag/mysql/)[Cloudflare Workers](/tag/workers/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)[PlanetScale](/tag/planetscale/)
