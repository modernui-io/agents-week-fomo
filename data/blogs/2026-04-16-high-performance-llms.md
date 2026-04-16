---
title: "Building the foundation for running extra-large language models"
date: 2026-04-16
url: https://blog.cloudflare.com/high-performance-llms/
authors: ["Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock", "Dillon Mulroy", "Matt Carey"]
---

# Building the foundation for running extra-large language models

By Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock, Dillon Mulroy, Matt Carey | 2026-04-16


# Building the foundation for running extra-large language models

2026-04-16

- [![Michelle Chen](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1hrcl3aVtUbBuCMeuXETWy/93dbfbc7d41c09ba35d863312dbde89d/michelle.jpg)

](/author/michelle/)[Michelle Chen](/author/michelle/)
- [![Kevin Flansburg](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/29HFdLgB6K9araMILKw0UC/63d21b12ba8f175cc062c56cd9c47f10/09ca573a-90e3-4497-bd9e-32720fd510ce_800x800.png)

](/author/kevin-flansburg/)[Kevin Flansburg](/author/kevin-flansburg/)
- [![Vlad Krasnov](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4aDp3XtkBoeuPj5b9e5oRE/084f9a39036700298e0a62b5e8c2aa3c/vlad-krasnov.jpg)

](/author/vlad-krasnov/)[Vlad Krasnov](/author/vlad-krasnov/)

8 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/H6HzVR3djJacCrzX8b8EE/aea7e8130edf09565333b6a550c010db/BLOG-3266_1.png)

An agent needs to be powered by a large language model. A few weeks ago, we announced that Workers AI is officially entering the arena for hosting large open-source models like Moonshot’s Kimi K2.5. Since then, we’ve made Kimi K2.5 3x faster and have more model additions in-flight. These models have been the backbone of a lot of the agentic products, harnesses, and tools that we have been launching this week. 

Hosting AI models is an interesting challenge: it requires a delicate balance between software and very, very expensive hardware. At Cloudflare, we’re good at squeezing every bit of efficiency out of our hardware through clever software engineering. This is a deep dive on how we’re laying the foundation to run extra-large language models.


    
      
## Hardware configurations


      [
        
      ](#hardware-configurations)
    
    As we mentioned in [our previous Kimi K2.5 blog post](https://blog.cloudflare.com/workers-ai-large-models/), we’re using a variety of hardware configurations in order to best serve models. A lot of hardware configurations depend on the size of inputs and outputs that users are sending to the model. For example, if you are using a model to write fanfiction, you might give it a few small prompts (input tokens) while asking it to generate pages of content (output tokens). 

Conversely, if you are running a summarization task, you might be sending in hundreds of thousands of input tokens, but only generating a small summary with a few thousand output tokens. Presented with these opposing use cases, you have to make a choice — should you tune your model configuration so it’s faster at processing input tokens, or faster at generating output tokens?

When we launched large language models on Workers AI, we knew that most of the use cases would be used for agents. With agents, you send in a large number of input tokens. It starts off with a large system prompt, all the tools, MCPs. With the first user prompt, that context keeps growing. Each new prompt from the user sends a request to the model, which consists of everything that was said before — all the previous user prompts, assistant messages, code generated, etc. For Workers AI, that means we had to focus on two things: fast input token processing and fast tool calling.


    
      
### Prefill decode (PD) disaggregation


      [
        
      ](#prefill-decode-pd-disaggregation)
    
    One hardware configuration that we use to improve performance and efficiency is disaggregated prefill. There are two stages to processing an LLM request: prefill, which processes the input tokens and populates the KV cache, and decode, which generates output tokens. Prefill is usually compute bound, while decode is memory bound. This means that the parts of the GPU that are used in each stage are different, and since prefill is always done before decode, the stages block one another. Ultimately, it means that we are not efficiently utilizing all of our GPU power if we do both prefill and decode on a single machine.

With prefill decode disaggregation, separate inference servers are run for each stage. First, a request is sent to the prefill stage which performs prefill and stores it in its KV cache. Then the same request is sent to the decode server, with information about how to transfer the KV cache from the prefill server and begin decoding. This has a number of advantages, because it allows the servers to be tuned independently for the role they are performing, scaled to account for more input-heavy or output-heavy traffic, or even to run on heterogeneous hardware.

This architecture requires a relatively complex load balancer to achieve. Beyond just routing the requests as described above, it must rewrite the responses (including streaming SSE) of the decode server to include information from the prefill server such as cached tokens. To complicate matters, different inference servers require different information to initiate the KV cache transfer. We extended this to implement token-aware load balancing, in which there is a pool of prefill and decode endpoints, and the load balancer estimates how many prefill or decode tokens are in-flight to each endpoint in the pool and attempts to spread this load evenly. 

After our public model launch, our input/output patterns changed drastically again. We took the time to analyze our new usage patterns and then tuned our configuration to fit our customer’s use cases.

Here’s a graph of our p90 Time to First Token drop after shifting traffic to our new PD disaggregated architecture, whilst request volume increased, using the same quantity of GPUs. We see a significant improvement in the tail latency variance.


          ![BLOG-3266 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5j6AEIF1GMhnHuJD08VQtw/9e65e2badc5fd1e75557230e8f455ccc/BLOG-3266_2.png)

Similarly, p90 time per token went from ~100 ms with high variance to 20-30 ms, a 3x improvement in intertoken latency.


          ![BLOG-3266 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/6MNBGFHwI3U0bYwuAosg2g/394f4f5708cc1d3b045dc3f52c64b808/BLOG-3266_3.png)


    
      
### Prompt Caching


      [
        
      ](#prompt-caching)
    
    Since agentic use cases usually have long contexts, we optimize for efficient prompt caching in order to not recompute input tensors on every turn. We leverage a header called `x-session-affinity` in order to help requests route to the right region that previously had the computed input tensors. We wrote about this in our [original blog post](https://blog.cloudflare.com/workers-ai-large-models/) about launching large LLMs on Workers AI. We added session affinity headers to popular agent harnesses [like OpenCode](https://github.com/anomalyco/opencode/pull/20744), where we noticed a significant increase in total throughput. A small difference in prompt caching from our users can sum to a factor of additional GPUs needed to run a model. While we have KV-aware routing internally, we also rely on clients sending the `x-session-affinity` in order to be explicit about prompt caching. We incentivize the use of the header by offering discounted cached tokens. We highly encourage users to [leverage prompt caching](https://developers.cloudflare.com/workers-ai/features/prompt-caching/) in order to have faster inference and cheaper pricing.


          ![BLOG-3266 4](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/gKzvEB0JlL1L0IHIby7TV/fe82399fe870d343a572f053d62b4e52/BLOG-3266_4.png)

We worked with our heaviest internal users to adopt this header. The result was an increase in input token cache hit ratios from 60% to 80% during peak times. This significantly increases the request throughput that we can handle, while offering better performance for interactive or time-sensitive sessions like OpenCode or AI code reviews.


    
      
### KV-cache optimization


      [
        
      ](#kv-cache-optimization)
    
    As we’re serving larger models now, one instance can span multiple GPUs. This means that we had to find an efficient way to share KV cache across GPUs. KV cache is where all the input tensors from prefill (result of prompts in a session) are stored, and initially lives in the VRAM of a GPU. Every GPU has a fixed VRAM size, but if your model instance requires multiple GPUs, there needs to be a way for the KV cache to live across GPUs and talk to each other. To achieve this for Kimi, we leveraged[ Moonshot AI’s](https://github.com/kvcache-ai/Mooncake) Mooncake Transfer Engine and Mooncake Store.

Mooncake’s Transfer Engine is a high-performance data transfer framework. It works with different Remote Direct Memory Access (RDMA) protocols such as NVLink and NVMe over Fabric, which enables direct memory-to-memory data transfer without involving the CPU. It improves the speed of transferring data across multiple GPU machines, which is particularly important in multi-GPU and multi-node configurations for models. 

When paired with LMCache or SGLang HiCache, the cache is shared across all nodes in the cluster, allowing a prefill node to identify and re-use a cache from a previous request that was originally pre-filled on a different node. This eliminates the need for session aware routing within a cluster and allows us to load balance the traffic much more evenly. Mooncake Store also allows us to extend the cache beyond GPU VRAM, and leverage NVMe storage. This extends the time that sessions remain in cache, improving our cache hit ratio and allowing us to handle more traffic and offer better performance to users.


    
      
### Speculative decoding


      [
        
      ](#speculative-decoding)
    
    LLMs work by predicting the next token in a sequence, based on the tokens that came before it. With a naive implementation, models only predict the next *n* token, but we can actually make it predict the next *n+1, n+2...* tokens in a single forward pass of the model. This popular technique is known as speculative decoding, which we’ve written about in a [previous post on Workers AI. ](https://blog.cloudflare.com/making-workers-ai-faster/)


          ![BLOG-3266 5](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/25Au0LKNr8ozQg5UQM34wY/06080a8699d5f8edb050450913a19a40/BLOG-3266_5.png)

With speculative decoding, we leverage a smaller LLM (the draft model) to generate a few candidate tokens for the target model to choose from. The target model then just has to select from a small pool of candidate tokens in a single forward pass. Validating the tokens is faster and less computationally expensive than using the larger target model to generate the tokens. However, quality is still upheld as the target model ultimately has to accept or reject the draft tokens.

In agentic use cases, speculative decoding really shines because of the volume of tool calls and structured outputs that models need to generate. A tool call is largely predictable — you know there will be a name, description, and it’s wrapped in a JSON envelope.

To do this with Kimi K2.5, we leverage [NVIDIA’s EAGLE-3](https://huggingface.co/nvidia/Kimi-K2.5-Thinking-Eagle3) (Extrapolation Algorithm for Greater Language-model Efficiency) draft model. The levers for tuning speculative decoding include the number of future tokens to generate. As a result, we’re able to achieve high-quality inference while speeding up tokens per second throughput.


    
      
## Infire: our proprietary inference engine


      [
        
      ](#infire-our-proprietary-inference-engine)
    
    As we announced during Birthday Week in 2025, Cloudflare has a proprietary inference engine, [Infire](https://blog.cloudflare.com/cloudflares-most-efficient-ai-inference-engine/), that makes machine learning models faster. Infire is an inference engine written in Rust, designed to support Cloudflare’s unique challenges with inference given our distributed global network. We’ve extended Infire support for this new class of large language models we are planning to run, which meant we had to build a few new features to make it all work.


    
      
### Multi-GPU support


      [
        
      ](#multi-gpu-support)
    
    Large language models like Kimi K2.5 are over 1 trillion parameters, which is about 560GB of model weights. A typical H100 has about 80GB of VRAM and the model weights need to be loaded in GPU memory in order to run. This means that a model like Kimi K2.5 needs at least 8 H100s in order to load the model into memory and run — and that’s not even including the extra VRAM you would need for KV Cache, which includes your context window.

Since we initially launched Infire, we had to add support for multi-GPU, letting the inference engine run across multiple GPUs in either pipeline-parallel or tensor-parallel modes with expert-parallelism supported as well.

For pipeline parallelism, Infire attempts to properly load balance all stages of the pipeline, in order to prevent the GPUs of one stage from starving while other stages are executing. On the other hand, for tensor parallelism, Infire optimizes for reducing cross-GPU communication, making it as fast as possible. For most models, utilizing both pipeline parallelism and tensor parallelism in tandem provides the best balance of throughput and latency.


    
      
### Even lower memory overhead


      [
        
      ](#even-lower-memory-overhead)
    
    While already having much lower GPU memory overhead than [vLLM](https://vllm.ai/), we optimized Infire even further, tightening the memory required for internal state like activations. Currently Infire is capable of running Llama 4 Scout on just two H200 GPUs with more than 56 GiB remaining for KV-cache, sufficient for more than 1.2m tokens. Infire is also capable of running Kimi K2.5 on 8 H100 GPUs (yes that is H100), with more than 30 GiB still available for KV-cache. In both cases you would have trouble even booting vLLM in the first place.


    
      
### Faster cold-starts


      [
        
      ](#faster-cold-starts)
    
    While adding multi-GPU support, we identified additional opportunities to improve boot times. Even for the largest models, such as Kimi K2.5, Infire can begin serving requests in under 20 seconds. The load times are only bounded by the drive speed.


    
      
### Maximizing our hardware for faster throughput


      [
        
      ](#maximizing-our-hardware-for-faster-throughput)
    
    Investing in our proprietary inference engine enables us to maximize our hardware by getting up to 20% higher tokens per second throughput on unconstrained systems, and also enabling us to use lower-end hardware to run the latest models, where it was previously completely infeasible.


    
      
## The journey doesn’t end


      [
        
      ](#the-journey-doesnt-end)
    
    New technologies, research, and models come out on a weekly basis for the machine learning community. We’re continuously optimizing our technology stack in order to provide high-quality, performant inference for our customers while operating our GPUs efficiently. If these sound like interesting challenges for you – [we’re hiring](https://www.cloudflare.com/careers/jobs/)!

Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Agents Week](/tag/agents-week/)[Agents](/tag/agents/)[AI](/tag/ai/)[Developer Platform](/tag/developer-platform/)[Developers](/tag/developers/)[Infrastructure](/tag/infrastructure/)[Workers AI](/tag/workers-ai/)
