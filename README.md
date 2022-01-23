# Denoflow

![Discord](https://img.shields.io/discord/932645476413628446?color=7289DA&label=Join%20Community)

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Contributing](./CONTRIBUTING.md)

## About <a name = "about"></a>

Denoflow is a simple, powerful, serverless automated workflow tool based [`yaml`](https://yaml.org/) workflow file and [Deno](https://deno.land/), you can use any Deno modules, Typescript/Javascript code to run your workflow. Denoflow will execute your workflow as you want.

> It's still at a very early stage, use with care!

The Ideal result is having some app schemas, using [rjsf](https://github.com/rjsf-team/react-jsonschema-form) to render a web gui, gui can help us to generate yaml configs.

The Ideal runtime is using cloud serverless platform, or CI platform, like [Github Actions](https://github.com/features/actions),  [Gitlab CI](https://gitlab.com/gitlab-org/gitlab-ci-runner/), self-hosted with [Deno](https://deno.land/), or any Docker runtime.

> [Deno Deploy](https://deno.com/deploy) is not supported yet, because it doesn't support Code generation from strings, Error Detail: `Code generation from strings disallowed for this context`
> See Github Actions Example: [test.yml](./.github/workflows/test.yml)

Now we can only write yaml by ourself, and actually, it's not that hard.

> Join our [Discord](https://discord.gg/vHmBgqvA) chat channel to discuss about Denoflow!

> Stable deno land version see [Denoflow](https://deno.land/x/denoflow)

## Playground

Try and exploring denoflow with the [Online Playground](https://playground.owenyoung.com)


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

> It will scan the `workflows` directory and run all valid `.yml` files.

> latest version: `https://denopkg.com/denoflow/denoflow@main/cli.ts`

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

A simple script generated exmaple:

```yaml
sources:
  - run: return [{id:"1"}]
    force: true
steps: 
  - run: console.log("item",ctx.item);
```

More examples are in [workflows](./workflows) directory, you can submit your awesome workflows.

Try [Online Playground](https://playground.owenyoung.com/) to explore workflow.

### Life Cycle 

1. `sources?`: where to fetch the data, `Source[]`, can be one or more sources. Every source should return an array of items.
    1. `from`?: import ts/js script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `ctx.sources[index].result` , if `use` is a class, then `ctx.result` will be the instance of the class.  `use` can also be `Deno.cwd` things, to call Deno functions.
    1. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. The return value will be attached to `ctx.result` and `ctx.sources[index].result`
    1. `itemsPath`?: the path to the items in the result, like `hits` in `https://test.owenyoung.com/slim.json`
    1. `key`?: the key to identify the item, like `objectID` in `https://test.owenyoung.com/slim.json`, if not provided, will use `id`, denoflow will hash the id, then the same item with `id` will be skipped.
    1. `filter?`, `string`, script code, should handle `ctx.item` -> return `true` or `false`
    1. `reverse?`, `boolean`, reverse the items
    1. `cmd`: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `ctx.sources[index].cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
1. `filter`? filter from all sources items, handle `ctx.items`, expected return a new `boolean[]`, 
    1. `from`?: import ts/js script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `filter.result`. if `use` is a class, then `ctx.result` will be the instance of the class.
    1. `run`?: run ts/js code, you can handle `use` result here.handle `ctx.items`, expected return a new `boolean[]`, flag which item will be used. e.g. `run: return ctx.items.map(item => item.title.value.includes('test'))`
    1. `cmd`?: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `filter.cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
1. `steps`? the steps to run, `Step[]`, can be one or more steps.
    1. `from`?: import script from `url` or `file path`  
    1. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function. if `use` is a class, then `ctx.result` will be the instance of the class.
    1. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. the result will be attached to the `ctx.steps[index].result`
    1. `cmd`?: exec shell commands, will be run after `run`, the result will be attached to the `ctx.steps[index].cmdResult`
    1. `post?`: post script code, you can do some check, clean, things here, change ctx.state
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

You can use `${{variable}}` in any fields to inject variables into your workflow, we inject `ctx` variable in template and script. For example:

#### Expressions

```yaml
steps:
  - if: ${{ctx.items.lengh>10}}
    run: console.log(ctx.item);
```

All `ctx` see [Syntax](#Syntax) in the following doc.

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


#### Syntax

All workflow syntax:

See [Interface](./src/core/interface.ts)

## Todo

- [x] Support Sleep Option
- [ ] Support GUI generated workflow
- [ ] Support `clean` command
- [x] denoflow playground
- [x] support new instance
