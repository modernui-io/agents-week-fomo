---
title: "Add voice to your agent"
date: 2026-04-15
url: https://blog.cloudflare.com/voice-agents/
authors: ["Sunil Pai", "Korinne Alpers", "Michelle Chen", "Kevin Flansburg", "Vlad Krasnov", "Ming Lu", "Gabriel Massadas", "Miguel Cardoso", "Anni Wang", "Vy Ton", "Matt Silverlock"]
---

# Add voice to your agent

By Sunil Pai, Korinne Alpers, Michelle Chen, Kevin Flansburg, Vlad Krasnov, Ming Lu, Gabriel Massadas, Miguel Cardoso, Anni Wang, Vy Ton, Matt Silverlock | 2026-04-15


# Add voice to your agent

2026-04-15

- [![Sunil Pai](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/2xnINigwFaBtTwOffppE85/596c43dfef6205e9c5b71c2caff4bea9/Sunil_Pai.png)

](/author/sunil/)[Sunil Pai](/author/sunil/)
- [![Korinne Alpers](https://blog.cloudflare.com/cdn-cgi/image/format=auto,dpr=3,width=64,height=64,gravity=face,fit=crop,zoom=0.5/https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5cfasTtVaoOsISarcB9F4Z/1686863c1bbd4dc0b74c7229cfcee42c/Korinne_Alpers.jpg)

](/author/korinne-alpers/)[Korinne Alpers](/author/korinne-alpers/)

7 min read![](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/3x9iEaw0deSu8ginBdFOYW/1cbc8507103c305cab2ec348eb773e79/BLOG-3198_1.png)

For many of us, our first experiences with AI agents have been through typing into a chat box. And for those of us using agents day to day, we have likely gotten very good at writing detailed prompts or markdown files to guide them.

But some of the moments where agents would be most useful are not always text-first. You might be on a long commute, juggling a few open sessions, or just wanting to speak naturally to an agent, have it speak back, and continue the interaction.

Adding voice to an agent should not require moving that agent into a separate voice framework. Today, we are releasing an experimental voice pipeline for the [Agents SDK](https://developers.cloudflare.com/agents/api-reference/voice/).

With `@cloudflare/voice`, you can add real-time voice to the same Agent architecture you already use. Voice just becomes another way you can talk to the same Durable Object, with the same tools, persistence, and WebSocket connection model that the Agents SDK already provides. 

`@cloudflare/voice` is an experimental package for the Agents SDK that provides: 

- `withVoice(Agent)` for full conversation voice agents
- `withVoiceInput(Agent)` for speech-to-text-only use cases, like dictation or voice search
- `useVoiceAgent` and `useVoiceInput` hooks for React apps
- `VoiceClient` for framework-agnostic clients
- Built-in [Workers AI](https://developers.cloudflare.com/workers-ai/) providers, so that you can get started without external API keys: 

- Continuous STT with [Deepgram Flux](https://developers.cloudflare.com/workers-ai/models/flux/)
- Continuous STT with[ Deepgram Nova 3](https://developers.cloudflare.com/workers-ai/models/nova-3/)
- Text-to-speech with [Deepgram Aura](https://developers.cloudflare.com/workers-ai/models/aura-1/)

This means you can now build an agent that users can talk to in real time over a single WebSocket connection, while keeping the same Agent class, Durable Object instance, and the same SQLite-backed conversation history. 

Just as importantly, we want this to be bigger than one fixed default stack. The provider interfaces in `@cloudflare/voice` are intentionally small, and we want speech, telephony, and transport providers to build with us, so developers can mix and match the right components for their use case, instead of being locked into a single voice architecture.


    
      
## Get started with voice


      [
        
      ](#get-started-with-voice)
    
    Here’s the minimal server-side pattern for a voice agent in the Agents SDK: 


            
```javascript
import { Agent, routeAgentRequest } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAITTS,
  type VoiceTurnContext
} from "@cloudflare/voice";

const VoiceAgent = withVoice(Agent);

export class MyAgent extends VoiceAgent<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);
  tts = new WorkersAITTS(this.env.AI);

  async onTurn(transcript: string, context: VoiceTurnContext) {
    return `You said: ${transcript}`;
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;


```


            That’s the whole server. You add a continuous transcriber, a text-to-speech provider, and implement `onTurn()`. 

On the client side, you can connect to it with a React hook: 


            
```Typescript
import { useVoiceAgent } from "@cloudflare/voice/react";

function App() {
  const {
    status,
    transcript,
    interimTranscript,
    startCall,
    endCall,
    toggleMute
  } = useVoiceAgent({ agent: "my-agent" });

  return (
    <div>
      <p>Status: {status}</p>
      {interimTranscript && <p><em>{interimTranscript}</em></p>}
      <ul>
        {transcript.map((msg, i) => (
          <li key={i}>
            <strong>{msg.role}:</strong> {msg.text}
          </li>
        ))}
      </ul>
      <button onClick={startCall}>Start Call</button>
      <button onClick={endCall}>End Call</button>
      <button onClick={toggleMute}>Mute / Unmute</button>
    </div>
  );
}

```


            If you are not using React, you can use `VoiceClient` directly from `@cloudflare/voice/client`. 


    
      
## How the voice pipeline works


      [
        
      ](#how-the-voice-pipeline-works)
    
    With the [Agents SDK](https://github.com/cloudflare/agents), every agent is a [Durable Object](https://developers.cloudflare.com/durable-objects/) — a stateful, addressable server instance with its own [SQLite database](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/), [WebSocket connections](https://developers.cloudflare.com/agents/api-reference/websockets/), and application logic. The voice pipeline extends this model instead of replacing it. 

At a high level, the flow looks like this:


          ![BLOG-3198 2](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/5IBi8TsQiJ18Um47zpqAIr/d284d47a8653c35bc7c027438a5a7a2c/unnamed__55_.png)

Here’s how the pipeline breaks down, step by step: 

1. **Audio transport: **The browser captures microphone audio and streams 16 kHz mono PCM over the same WebSocket connection the agent already uses.
2. **STT session setup:  **When the call starts, the agent creates a continuous transcriber session that lives for the duration of the call.
3. **STT input: **Audio streams continuously into that session.
4. **STT turn detection: **The speech-to-text model itself decides when the user has finished an utterance and emits a stable transcript for that turn.
5. **LLM/application logic: **The voice pipeline passes that transcript to your `onTurn(`) method.
6. **TTS output: **Your response is synthesized to audio and sent back to the client. If `onTurn()` returns a stream, the pipeline sentence-chunks it and starts sending audio as sentences are ready.
7. **Persistence: **The user and agent messages are persisted in SQLite, so conversation history survives reconnections and deployments.


    
      
## Why voice should grow with the rest of your agent


      [
        
      ](#why-voice-should-grow-with-the-rest-of-your-agent)
    
    Many voice frameworks focus on the voice loop itself: audio in, transcription, model response, audio out. Those are important primitives, but there’s a lot more to an agent than just voice. 

Real agents running in production will grow. They need state, scheduling, persistence, tools, workflows, telephony, and ways to keep all of that consistent across channels. As your agent grows in complexity, voice stops being a standalone feature and becomes part of a larger system. 

We wanted voice in the Agents SDK to start from that assumption. Instead of building voice as a separate stack, we built it on top of the same Durable Object-based agent platform, so you can pull in the rest of the primitives you need without re-architecting the application later.


    
      
### Voice and text share the same state


      [
        
      ](#voice-and-text-share-the-same-state)
    
    A user might start by typing, switch to voice, and go back to text. With Agents SDK, these are all just different inputs to the same agent. The same conversation history lives in SQLite, and the same tools are available. This gives you both a cleaner mental model and a much simpler application architecture to reason about. 


    
      
## Lower latency comes from...


      [
        
      ](#lower-latency-comes-from)
    
    
    
      
### a shorter network path


      [
        
      ](#a-shorter-network-path)
    
    Voice experiences feel good or bad very quickly. Once a user stops speaking, the system needs to transcribe, think, and start speaking back fast enough to feel conversational. 

A lot of voice latency is not pure model time. It’s the cost of bouncing audio and text between different services in different places. Audio needs to go to STT, transcripts go to an LLM, and responses go to a TTS model – and each handoff adds network overhead. 

With the Agents SDK voice pipeline, the agent runs on Cloudflare’s network, and the built-in providers use Workers AI bindings. That keeps the pipeline tighter and reduces the amount of infrastructure you have to stitch together yourself. 


    
      
### built-in streaming


      [
        
      ](#built-in-streaming)
    
    A voice agent interaction feels much more natural if it speaks the first sentence quickly (also called Time-to-First Audio). When `onTurn()` returns a stream, the pipeline chunks it into sentences and starts synthesis as sentences complete. That means the user can hear the beginning of the answer while the rest is still being generated. 


    
      
## A more realistic backend


      [
        
      ](#a-more-realistic-backend)
    
    Here is a fuller example that streams an LLM response and starts speaking it back, sentence by sentence:


            
```Typescript
import { Agent, routeAgentRequest } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAITTS,
  type VoiceTurnContext
} from "@cloudflare/voice";
import { streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";

const VoiceAgent = withVoice(Agent);

export class MyAgent extends VoiceAgent<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);
  tts = new WorkersAITTS(this.env.AI);

  async onTurn(transcript: string, context: VoiceTurnContext) {
    const ai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: ai("@cf/cloudflare/gpt-oss-20b"),
      system: "You are a helpful voice assistant. Be concise.",
      messages: [
        ...context.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user" as const, content: transcript }
      ],
      abortSignal: context.signal
    });

    return result.textStream;
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;

```


            `Context.messages` gives you recent SQLite-backed conversation history, and `context.signal` lets the pipeline abort the LLM call if the user interrupts. 


    
      
## Voice as an input: withVoiceInput


      [
        
      ](#voice-as-an-input-withvoiceinput)
    
    Not every speech interface needs to speak back. Sometimes you might want dictation, transcription, or voice search. For these use cases, you can use `withVoiceInput`


            
```Typescript
import { Agent, type Connection } from "agents";
import { withVoiceInput, WorkersAINova3STT } from "@cloudflare/voice";

const InputAgent = withVoiceInput(Agent);

export class DictationAgent extends InputAgent<Env> {
  transcriber = new WorkersAINova3STT(this.env.AI);

  onTranscript(text: string, _connection: Connection) {
    console.log("User said:", text);
  }
}

```


            On the client, `useVoiceInput` gives you a lightweight interface centered on transcriptions: 


            
```Typescript
import { useVoiceInput } from "@cloudflare/voice/react";

const { transcript, interimTranscript, isListening, start, stop, clear } =
  useVoiceInput({ agent: "DictationAgent" });

```


            This is useful when speech is an input method, and you don’t need a full conversational loop. 


    
      
## Voice and text on the same connection


      [
        
      ](#voice-and-text-on-the-same-connection)
    
    The same client can call `sendText(“What’s the weather?”)`, which bypasses STT and sends the text directly to `onTurn()`. During an active call, the response can be spoken and shown as text. Outside a call, it can remain text-only. 

This gives you a genuinely multimodal agent, without splitting the implementation into different code paths. 


    
      
## What else can you build?


      [
        
      ](#what-else-can-you-build)
    
    Because a voice agent is still an agent, all the normal Agents SDK capabilities still apply. 


    
      
### Tools and scheduling


      [
        
      ](#tools-and-scheduling)
    
    You can greet a caller when a session starts: 


            
```Typescript
import { Agent, type Connection } from "agents";
import { withVoice, WorkersAIFluxSTT, WorkersAITTS } from "@cloudflare/voice";

const VoiceAgent = withVoice(Agent);

export class MyAgent extends VoiceAgent<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);
  tts = new WorkersAITTS(this.env.AI);

  async onTurn(transcript: string) {
    return `You said: ${transcript}`;
  }

  async onCallStart(connection: Connection) {
    await this.speak(connection, "Hi! How can I help you today?");
  }
}

```


            You can schedule spoken reminders and expose tools to your LLM just like any other agent: 


            
```Typescript
import { Agent } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAITTS,
  type VoiceTurnContext
} from "@cloudflare/voice";
import { streamText, tool } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

const VoiceAgent = withVoice(Agent);

export class MyAgent extends VoiceAgent<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);
  tts = new WorkersAITTS(this.env.AI);

  async speakReminder(payload: { message: string }) {
    await this.speakAll(`Reminder: ${payload.message}`);
  }

  async onTurn(transcript: string, context: VoiceTurnContext) {
    const ai = createWorkersAI({ binding: this.env.AI });

    const result = streamText({
      model: ai("@cf/cloudflare/gpt-oss-20b"),
      messages: [
        ...context.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user" as const, content: transcript }
      ],
      tools: {
        set_reminder: tool({
          description: "Set a spoken reminder after a delay",
          inputSchema: z.object({
            message: z.string(),
            delay_seconds: z.number()
          }),
          execute: async ({ message, delay_seconds }) => {
            await this.schedule(delay_seconds, "speakReminder", { message });
            return { confirmed: true };
          }
        })
      },
      abortSignal: context.signal
    });

    return result.textStream;
  }
}

```


            
    
      
### Runtime model switching


      [
        
      ](#runtime-model-switching)
    
    The voice pipeline also lets you choose a transcription model dynamically per connection. 

For example, you might prefer Flux for conversational turn-taking and Nova 3 for higher-accuracy dictation. You can switch at runtime by overriding `createTranscriber()`: 


            
```Typescript
import { Agent, type Connection } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  WorkersAINova3STT,
  WorkersAITTS,
  type Transcriber
} from "@cloudflare/voice";

export class MyAgent extends VoiceAgent<Env> {
  tts = new WorkersAITTS(this.env.AI);

  createTranscriber(connection: Connection): Transcriber {
    const url = new URL(connection.url ?? "http://localhost");
    const model = url.searchParams.get("model");
    if (model === "nova-3") {
      return new WorkersAINova3STT(this.env.AI);
    }
    return new WorkersAIFluxSTT(this.env.AI);
  }
}

```


            On the client, you can pass query parameters through the hook: 


            
```Typescript
const voiceAgent = useVoiceAgent({
  agent: "my-voice-agent",
  query: { model: "nova-3" }
});

```


            
    
      
## Pipeline hooks


      [
        
      ](#pipeline-hooks)
    
    You can also intercept data between stages: 

- `afterTranscribe(transcript, connection)`
- `beforeSynthesize(text, connection)`
- `afterSynthesize(audio, text, connection)`

These hooks are useful for content filtering, text normalization, language-specific transformations, or custom logging. 


    
      
## Telephone and transport options


      [
        
      ](#telephone-and-transport-options)
    
    By default, the voice pipeline uses a single WebSocket connection as the simplest path for 1:1 voice agents. But that’s not the only option. 


    
      
### Phone calls via Twilio


      [
        
      ](#phone-calls-via-twilio)
    
    You can connect phone calls to the same agent using the Twilio adapter:


            
```Typescript
import { TwilioAdapter } from "@cloudflare/voice-twilio";

export default {
  async fetch(request: Request, env: Env) {
    if (new URL(request.url).pathname === "/twilio") {
      return TwilioAdapter.handleRequest(request, env, "MyAgent");
    }

    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
};

```


            This lets the same agent handle web voice, text input, and phone calls. 

One caveat: the default Workers AI TTS provider returns MP3, while Twilio expects mulaw 8kHz audio. For production telephony, you may want to use a TTS provider that outputs PCM or mulaw directly. 


    
      
### WebRTC


      [
        
      ](#webrtc)
    
    If you need a transport that is better suited to difficult network conditions or will include multiple participants, the voice package also includes SFU utilities and supports custom transports. The default model is WebSocket-native today, but we plan to develop more adapters to connect to our [global SFU infrastructure](https://developers.cloudflare.com/realtime/sfu/). 


    
      
## Build with us


      [
        
      ](#build-with-us)
    
    The voice pipeline is provider-agnostic by design. 

Under the hood, each stage is defined by a small interface: a transcriber opens a continuous session and accepts audio frames as they arrive, while a TTS provider takes text and returns audio. If a provider can stream audio output, the pipeline can use that too.


            
```Typescript
interface Transcriber {
  createSession(options?: TranscriberSessionOptions): TranscriberSession;
}

interface TranscriberSession {
  feed(chunk: ArrayBuffer): void;
  close(): void;
}

interface TTSProvider {
  synthesize(text: string, signal?: AbortSignal): Promise<ArrayBuffer | null>;
}

```


            We didn’t want voice support in Agents SDK to only work with one fixed combination of models and transports. We wanted the default path to be simple, while still making it easy to plug in other providers as the ecosystem grows. 

The built-in providers use Workers AI, so you can get started without external API keys:

- `WorkersAIFluxSTT` for conversational streaming STT
- `WorkersAINova3STT` for dictation-style streaming STT
- `WorkersAITTS` for text-to-speech

But the bigger goal is interoperability. If you maintain a speech or voice service, these interfaces are small enough to implement without needing to understand the rest of the SDK internals. If your STT provider accepts streaming audio and can detect utterance boundaries, it can satisfy the transcriber interface. If your TTS provider can stream audio output, even better. 

We would love to work on interoperability with:

- STT providers like AssemblyAI, Rev.ai, Speechmatics, or any service with a real-time transcription API
- TTS providers like PlayHT, LMNT, Cartesia, Coqui, Amazon Polly, or Google Cloud TTS
- telephony adapters for platforms like Vonage, Telnyx, or Bandwidth
- transport implementations for WebRTC data channels, SFU bridges, and other audio transport layers

We are also interested in collaborations that go beyond individual providers:

- latency benchmarking across STT + LLM + TTS combinations
- multilingual support and better documentation for non-English voice agents
- accessibility work, especially around multimodal interfaces and speech impairments

If you are building voice infrastructure and want to see a first-class integration, [open a PR](https://github.com/cloudflare/agents/pulls) or reach out.


    
      
## Try it now


      [
        
      ](#try-it-now)
    
    The voice pipeline is available today as an experimental package:


            
```Shell
npm create cloudflare@latest -- --template cloudflare/agents-starter

```


            Add `@cloudflare/voice`, give your agent a transcriber and a TTS provider, deploy it, and start talking to it. You can also read the [API reference](https://developers.cloudflare.com/agents/api-reference/voice/). 

If you build something interesting, open an issue or PR on [github.com/cloudflare/agents](https://github.com/cloudflare/agents). Voice should not require a separate stack, and we think the best voice agents will be the ones built on the same durable application model as everything else.


          ![BLOG-3198 3](https://cf-assets.www.cloudflare.com/zkvhlag99gkb/1SLeHwqXY0ehOUsy5Nzzq2/c16244f45b8411f8817b9a21b45ed4b8/BLOG-3198_3.png)


Cloudflare's connectivity cloud protects [entire corporate networks](https://www.cloudflare.com/network-services/), helps customers build [Internet-scale applications efficiently](https://workers.cloudflare.com/), accelerates any [website or Internet application](https://www.cloudflare.com/performance/accelerate-internet-applications/), [wards off DDoS attacks](https://www.cloudflare.com/ddos/), keeps [hackers at bay](https://www.cloudflare.com/application-security/), and can help you on [your journey to Zero Trust](https://www.cloudflare.com/products/zero-trust/).

Visit [1.1.1.1](https://one.one.one.one/) from any device to get started with our free app that makes your Internet faster and safer.

To learn more about our mission to help build a better Internet, [start here](https://www.cloudflare.com/learning/what-is-cloudflare/). If you're looking for a new career direction, check out [our open positions](https://www.cloudflare.com/careers).  [Cloudflare Workers](/tag/workers/)[AI](/tag/ai/)[Agents Week](/tag/agents-week/)[Developers](/tag/developers/)[Agents](/tag/agents/)[Durable Objects](/tag/durable-objects/)
