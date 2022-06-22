# Denoflow

[![Discord](https://img.shields.io/discord/932645476413628446?color=7289DA&label=Join%20Community)](https://discord.gg/wz6UJpGqtb) 

[简体中文文档](./README-ZH.md) · [Deno Land](https://deno.land/x/denoflow)

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Faq](#faq)
- [Contributing](./CONTRIBUTING.md)

## About <a name = "about"></a>

With denoflow, you'll use [`yaml`](https://yaml.org/)  to write automated workflow that runs on [Deno](https://deno.land/), with any Deno modules, Typescript/Javascript code in your workflow. Denoflow will execute your workflow as you want. You can think of it as configuration-as-code. 

Consider it an alternative to Zapier or IFTTT, for example fetching articles at regular intervals via RSS and then performing some tasks for non-repeating articles.

> It's still at a very early stage, use with care!

> If we need some GUI features, the ideal result is having some app schemas, using [rjsf](https://github.com/rjsf-team/react-jsonschema-form) to render a web gui, gui can help us to generate yaml configs.

The ideal runtime is using cloud serverless platform, or CI platform, like [Github Actions](https://github.com/features/actions),  [Gitlab CI](https://gitlab.com/gitlab-org/gitlab-ci-runner/), self-hosted with [Deno](https://deno.land/), or any Docker runtime.

> [Deno Deploy](https://deno.com/deploy) is not supported yet, because it doesn't support Code generation from strings, Error Detail: `Code generation from strings disallowed for this context`
> See Github Actions Example: [test.yml](./.github/workflows/test.yml)

Now we can only write yaml by ourself, and actually, it's not that hard.

> Join our [Discord](https://discord.gg/wz6UJpGqtb) chat channel to discuss about Denoflow!

> Stable deno land version see [Denoflow](https://deno.land/x/denoflow)

## Playground

Try and exploring denoflow with the [Online Playground](https://playground.owenyoung.com)

## Why Deno?

- Deno uses URLs to import modules, which gives us very flexible and convenient workflow scripting capabilities, and you can use any module you want very easily.
- Deno is based on modern features of the JavaScript language, and officially provides a standard library that covers most of the commonly used features in workflows.
- Deno's default zero permissions design, which is important for workflow security, so that you can give your workflows only the permissions they need.

> I have written [actionsflow](https://actionsflow.github.io/) before, it must run in github actions, or local Docker, for workflow is too heavy, I found Deno features make it more suitable for doing flexible workflow based on yaml configuration, hope Denoflow can become a simple but powerful workflow assistant.


## Prerequisites

Install [Deno](https://deno.land/#installation) first.

## Getting Started <a name = "getting_started"></a>

Fetch from Hacker News API to webhook example:

```bash
mkdir workflows
```

```bash
touch workflows/fetch.yml
```

```yaml
sources:
  - from: https://deno.land/x/axiod@0.24/mod.ts
    use: get
    args:
      - https://test.owenyoung.com/slim.json
    itemsPath: data.hits
    key: objectID
    limit: 1
steps: 
  - run: console.log('item', ctx.item)
  # Open: <https://requestbin.com/r/enyvb91j5zjv9/23eNPamD4DK4YK1rfEB1FAQOKIj> , See live webhook request.
  - from: https://deno.land/x/axiod@0.24/mod.ts
    use: post
    args:
      - https://enyvb91j5zjv9.x.pipedream.net/
      -  ${{ctx.item}}
      - headers:
          'Content-Type': 'application/json'
```
Open: <https://requestbin.com/r/enyvb91j5zjv9/23eNPamD4DK4YK1rfEB1FAQOKIj> , See live webhook request.

```bash
deno run --allow-read --allow-net --allow-write --allow-env --allow-run https://deno.land/x/denoflow/cli.ts run
```

> Or simplly with all permissions: `deno run -A https://deno.land/x/denoflow/cli.ts run`

> Denoflow will scan the `workflows` directory and run all valid `.yml` files.

> latest version: `https://denopkg.com/denoflow/denoflow@main/cli.ts`

> Try it at [Online Playground](https://playground.owenyoung.com/)

If you prefer to use `fetch`:

```yaml
sources:
  - use: fetch
    args:
      - https://test.owenyoung.com/slim.json
    run: return ctx.result.json()
    itemsPath: hits
    key: objectID
    limit: 1
steps: 
  - use: fetch
    args:
      - https://enyvb91j5zjv9.x.pipedream.net/
      - method: POST
        headers:
          Content-Type: application/json
        body: ${{JSON.stringify(ctx.item)}}

```

> Try it at [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMswb2QMxgBcoALFVZAQwgHMFyL1kTDCAHBAek8LkIDoQAdxgA7AJ7hRNflBABbTsAA2AS3n8AVqFENkEMKNwQikUciiEAHvxPAwygdpCiAFAEo9q3vOAAFSkISXBJvYD0AaxhxXBAAI00YSwBJABE9NXlvXABGRGBeDlxyDAMjCxdQZRh+ZRAaVwBybxh5RoAaSxsWjUJvavcAbnIAYmQAeTYxXAAeFnYuThMARzA+ONVRWQUlzjFxADc4gE4czQBWAC9NA+POACYAZhgAOQD5VIAWVIBpT4BNH45CB4ACiACEcgAxACCAEVxj9kpoAHzIdrIADKMBgyDUB1xIjiJBAIAi+hgqz4-BKmGwuAIxDIjGodCQjFQGHmRW4+yOpwu11u-BsbFUUwAJiZKBpREROHpOch5EQSRLcH5xpiACqKigkGCUCUwCD0DkcxoAYRcvFEhDQ2vEU0auEalDYbDUUECqhcnGcokaetQcRAEpiyAAJABvaMAKUx4xe-AKEE2NFUeHEri6-B67gAvgXEEA)


### RSS Feed to Discord Webhook Message

```bash
touch workflows/rss.yml
```


```yaml
sources:
  - from: https://deno.land/x/denoflow@0.0.19/sources/rss.ts
    args:
      - https://actionsflow.github.io/test-page/hn-rss.xml
    limit: 1
steps:
  - use: fetch
    args:
      - ${{env.DISCORD_WEBHOOK}}
      - method: POST
        headers:
          Content-Type: application/json
        body: ${{ JSON.stringify({content:ctx.item.title.value}) }}
```

> Try it at [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMgZhEBbeyAFgC7EAOCA9JQCYwB2IAdADYCG9NlAHrQyJhYgA7gAEADE0kAmAIyVQkWMEoRgwJsWApUyNhADmCHbvRFSFeNTZRiASxD1ggkUwN3ihMACMmDysRwxGhkbAYwlIT0aGoa3LgsJsgsdrgeBLJJmCDQMATEEGAwiMCBljoYhfQEUI6gLDCsIAYAFADkHjC4bQA0ttx+gbgAlBXIYMB5WDDEUIRJAMTIAPJkDAQAPCTkVKowAI5Fpd529Ey1uKqUDACeAG7eAJyyAFYArABeL3ePlNIAzDAAHIABTYuAAIgAWCEAaShAE1YbIIJgAKIAIVkADEAIIARWWsIAki8AHzIHrIADKMBgyTsd3pwhg3kIIBAAGtkBADkdiEweTAyOxYMgbuAIMgWWyOdzCDBeUkGHckKZUBDidSAMLLABKEIA+gB1TEACWWRII20s1FuD2e7y+PyYAzIdjWNF54KY9BmlCS+iMavVGAAJABvCP9JgqpianX6o2mjEWokAX3TSVQGFwM3ZNAIIOW1IAKtndAq2HQ1CH1bptY5AvRgqWbmsCGwyCK7FA2PZHJQXqB6BXUN4QDQbgRIxHkAApanLIFMUoQU7uTA3FrRpsMYjwGOdXCaDwNJh3NgsIrp4bITOIIA)


Or, if you prefer more `raw` way:

```yaml
sources:
  - use: fetch
    args:
      - https://actionsflow.github.io/test-page/hn-rss.xml
    run: |
      const rss = await import("https://deno.land/x/rss/mod.ts");
      const xml = await ctx.result.text();
      const feed = await rss.parseFeed(xml);
      return feed.entries;
    limit: 1
steps:
  - use: fetch
    args:
      - ${{ctx.env.DISCORD_WEBHOOK}}
      - method: POST
        headers:
          'Content-Type': 'application/json'
        body: ${{ JSON.stringify({content:ctx.item.title.value}) }}
```

```bash
deno run --allow-read --allow-net --allow-write --allow-run --allow-env https://deno.land/x/denoflow/cli.ts run
```

> Try it at [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMswb2QMxgBcoALFVZAQwgHMFyL1kTDCAHBAek8qkIEsQAO2B4ANiADuAOhr9CJMACNpgzoTiE0bSjRicSQtBGDBpADwC2YhsghghuAD63UUYcEJ3TyALxVJSnlkfks2EAhCAAoAIhZ2Lk4AExghEGkxSiEkznNOE2BOSxAk6UJgGIBKAG5XZHcRLysxPwCgrz5zaQg4MDFCMphzaJq6hs98GBgk1spA4ILpHRMYADEppKjm0cZUHsJIIUnp6VTCCH44WsYxUPlcAEZETxgOJFQMLBxJ4jJGAGJkAB5NipXAAHnib24PQAjmBNEp+EJpO5LPlOKkAJ4ANyUAE4HgArACsAC8iTj8ZwAEwAZhgADkAAqUSwAEQALOyANKcgCaPIeEDwAFEAEIPVYAQQAikCeQBJIkAPmQABpkABlKbIW44mDISQwJQkEAgADWdhg8M00mtbEysGQWPAECNJrNluYMB6tlSOPeu3Ziq1AGEgQAldkAfQA6hKABJAhW4KGJbF4wmkilUixLfigpI9NnSIRETi2ah0IOMDAAEgA3o3OqchDjpCHw1HYwnxcmFQBfQd1DCWIhmpK4ZlArUAFTqqBIMEoKRMtd2qDDwg0Qi0c6xoNwlDYjv4UEoAmEnCJoCEi+QShKWNwTcbyAAUlqgYzpJ4LkIch4FiUQtjuZzwK28gwJYZTyGIMDSDilBiAig6VMgw5AA)

A simple script generated exmaple:

```yaml
sources:
  - run: return [{id:"1"}]
    force: true
steps: 
  - run: console.log("item",ctx.item);
```

> Try it at [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMiYB29MwBdJtkBtAbwEsATeAIgEY6BfAXRVWQDMRoY8CWGImAEYABwTIOGLLmRQQ2UABsYAOhUgA5gAo6lMQFs6AGigEAHusMwjASgDciIA)

More examples are in [workflows](./workflows) directory, you can submit your awesome workflows.

Try [Online Playground](https://playground.owenyoung.com/) to explore workflow.

### Life Cycle 

1. `sources?`: where to fetch the data, `Source[]`, can be one or more sources. Every source should return an array of items. e.g. `[{"id":"1"}]`, the item key can be specified in `key` field.
    1. `from`?: import ts/js script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run global function like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `ctx.sources[index].result` , if `use` is a class, then `ctx.result` will be the instance of the class.  `use` can also be `Deno.cwd` things, to call Deno functions.
    1. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. The return value will be attached to `ctx.result` and `ctx.sources[index].result`
    1. `itemsPath`?: the path to the items in the result, like `hits` in `https://test.owenyoung.com/slim.json`
    1. `key`?: the key to identify the item, like `objectID` in `https://test.owenyoung.com/slim.json`, if not provided, will use `id`, denoflow will hash the id, then the same item with `id` will be skipped.
    1. `reverse?`, `boolean`, reverse the items
    1. `filter?`, `string`, script code, should handle `ctx.item` -> return `true` or `false`
    1. `cmd`: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `ctx.sources[index].cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
1. `filter`? filter from all sources items, handle `ctx.items`, expected return a new `boolean[]`, 
    1. `from`?: import ts/js script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run global function like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `ctx.sources[index].result` , if `use` is a class, then `ctx.result` will be the instance of the class.  `use` can also be `Deno.cwd` things, to call Deno functions.
    1. `run`?: run ts/js code, you can handle `use` result here.handle `ctx.items`, expected return a new `boolean[]`, flag which item will be used. e.g. `run: return ctx.items.map(item => item.title.value.includes('test'))`
    1. `cmd`?: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `filter.cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
1. `steps`? the steps to run, `Step[]`, can be one or more steps.
    1. `from`?: import script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run global function like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `ctx.sources[index].result` , if `use` is a class, then `ctx.result` will be the instance of the class.  `use` can also be `Deno.cwd` things, to call Deno functions.
    1. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. the result will be attached to the `ctx.steps[index].result`
    1. `cmd`?: exec shell commands, will be run after `run`, the result will be attached to the `ctx.steps[index].cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
1. `post`? final post script code, run after all steps done, you can do some check, clean, things here. You can use all steps params here.

### Installing

```bash
deno install -n denoflow --allow-read --allow-net --allow-write --allow-run --allow-env  https://deno.land/x/denoflow/cli.ts
```

Then, you can run it with `denoflow run` , or `denoflow run <files>`

#### Update to latest version

```bash
deno cache --reload https://deno.land/x/denoflow/cli.ts
```

## Usage <a name = "usage"></a>

```bash
denoflow/0.0.17

Usage:
  $ denoflow run [...files or url]

Options:
  --force     Force run workflow files, if true, will ignore to read/save state
  --debug     Debug mode, will print more info
  --database  Database uri, default json://data
  --limit     max items for workflow every runs
  --sleep     sleep time between sources, filter, steps, unit seconds
  --stdin     read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin
  -h, --help  Display this message
```



### YAML Syntax

If you are not yet familiar with YAML syntax, take [5 minutes](https://www.codeproject.com/Articles/1214409/Learn-YAML-in-five-minutes) to familiarize yourself with.

You can use `${{variable}}` in any fields to inject variables into your workflow, we inject `ctx` variable in template and script. For example:

#### Expressions

```yaml
steps:
  - if: ${{ctx.items.lengh>10}}
    run: console.log(ctx.item);
```

All `ctx` variables, See [Interface](./core/interface.ts)

#### State

You can simply use `ctx.state` to get or set state, for example:

```js
let currentState = ctx.state || {};

let sent = ctx.state.sent || [];

if(sent.includes(ctx.item.id)){
  sent.push(ctx.item.id);
}

ctx.state = {
  sent
};

// deno flow will save the state for you , next you can read it.
return;
```

The state will be saved to `data` folder in `json` format. You can also use sqlite to store the state. Just set `database: sqlite://data.sqlite` in your workflow config file.



## Faq

### How to schedule a workflow?

Cause denoflow designed for serverless, simple, so it self can't schedule a workflow. You can use `cron` or other trigger to schedule a workflow. For example:

```bash
*/15 * * * * deno run --allow-read --allow-net --allow-write --allow-env --allow-run https://deno.land/x/denoflow/cli.ts run workflows/schedule15.yml
```


### How to handle a webhook?

Like above, denoflow can't handle webhook directly, you can forward the webhook to denoflow, For github actions example:

`Webhook.yml`:

```yaml
sources:
  - run: return [ctx.env.event]
    force: true
steps: 
  - run: console.log("item",ctx.item);
```

`.github/workflows/webhook.yml`:

```yaml
name: Webhook
on:
  repository_dispatch:
  workflow_dispatch:
jobs:
  denoflow:
    runs-on: ubuntu-latest
    concurrency: denoflow
    steps:
      - name: Check out repository code
        uses: actions/checkout@v2
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      - env:
          event: ${{toJSON(github.event)}}
        run: deno run --allow-read --allow-net --allow-write --allow-env --allow-run https://deno.land/x/denoflow/cli.ts run workflows/webhook.yml
```

## Why configuration is better than script?

If you write scripts directly, it will make maintenance very confusing, each script has to handle its own de-duplication and process management, using configuration files to write more readable, maintainable, to achieve a certain degree of low code.


## Todo

- [x] Support Sleep Option
- [ ] Support GUI generated workflow
- [ ] Support `clean` command
- [x] denoflow playground
- [x] support new instance
