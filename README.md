# Denoflow

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Contributing](./CONTRIBUTING.md)

## About <a name = "about"></a>

Deno script based `yaml` workflow file.

WIP. Use with care.

Ideal result is having  a apps schemas, with a web gui to generate yaml configs.

Now we can write yaml by ourself, and actually, it's not that hard.

## Getting Started <a name = "getting_started"></a>

```bash
mkdir workflows
```

### Fetch Example

Fetch from Hacker News API to webhook.

```bash
touch workflows/fetch.yml
```

```yaml
on:
  use: fetch
  args:
    - https://test.owenyoung.com/slim.json
  then: return ctx.result.json()
  itemsPath: hits
  uniqueKey: objectID
steps: 
  - use: fetch
    args:
      - https://enyvb91j5zjv9.x.pipedream.net/
      - method: POST
        headers:
          'Content-Type': 'application/json'
        body: ${{JSON.stringify(ctx.item)}}
```

Open: <https://requestbin.com/r/enyvb91j5zjv9/23eNPamD4DK4YK1rfEB1FAQOKIj> , See live webhook request.

```bash
deno run --allow-read --allow-net --allow-write --allow-env --unstable https://denopkg.com/denoflow/denoflow@main/cli.ts run
```

> It will scan the `workflows` directory and run all valid `.yml` files.


### RSS Feed to Discord Webhook Message

```bash
touch workflows/rss.yml
```

```yaml
on:
  use: fetch
  args:
    - https://actionsflow.github.io/test-page/hn-rss.xml
  then: |
    const rss = await import("https://deno.land/x/rss/mod.ts");
    const xml = await ctx.result.text();
    const feed = await rss.parseFeed(xml);
    return feed.entries;
steps:
  - use: fetch
    args:
      - <your discord webhook url>
      - method: POST
        headers:
          'Content-Type': 'application/json'
        body: ${{ JSON.stringify({content:ctx.item.title.value}) }}
```

```bash
deno run --allow-read --allow-net --allow-write --allow-env --unstable https://denopkg.com/denoflow/denoflow@main/cli.ts run
```

### Life Cycle 

```bash

[on.use] -> [on.then] -> [on.run] -> [step.use] -> [step.then] -> [step.run] 

```

### Prerequisites

Install [Deno](https://deno.land/#installation) first.


### Installing

```bash
deno install -n denoflow --allow-read --allow-net --allow-write --allow-env  https://denopkg.com/denoflow/denoflow@main/cli.ts
```

Then, you can run it with `denoflow run` , or `denoflow run <files>`

## Usage <a name = "usage"></a>

```bash
Usage:
  $ denoflow run [...files]

Options:
  --force      Force run workflow files (default: false)
  --max-items  max items for workflow every runs 
  -h, --help   Display this message
```



### YAML Syntax

You can use `${{variable}}` in any fields to inject variables into your workflow, we inject `ctx` variable in template and script. For example:

#### Expressions

```yaml
steps:
  - if: ${{ctx.items.lengh>10}}
    then: console.log(ctx.item);
```

All `ctx` see [Context](#Context)

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

The state will be saved to `data` folder in `json` format. If needed, we'll add sqlite or postgres etc as the key value database.


#### Syntax

All workflow syntax:

```yaml
on:
  # Optional, environment variables to set before running the trigger
  env:
    test: test
  # Optional, if run the trigger
  if: true
  # Optional run a ts file, can use local file, cwd based workflow file
  from: https://deno.land/x/axiod@0.24/mod.ts
  # Optional, module name, default is the default exported module.
  # If from is not provided, will use global function.
  use: get
  # Function parameters, support all types, nested object
  args:
    - https://test.owenyoung.com/slim.json
  # Optional, When function succeeds, will run the then script
  then: return ctx.result;
  # items path, default is the root result. e.g. `data.items` `data.list` 
  itemsPath: hits
  # item id, default is `id`, e.g. `guid`, `item.id`
  uniqueKey: objectID
  # force, ignore uniqueKey, trigger all items. the Default is false
  force: true
  # Optional, maxItems , default is undefined, means no limit, if set, will run first n items with steps.
  maxItems: 1
steps:
  - from: ./to-json.ts
    if: ${{ctx.env.test === 'test2'}}
    env:
      test: test
    args:
      - ${{ctx.item}}
      - ${{ctx.state}}

```


#### Context

```ts
export interface PublicContext {
  env: Record<string, string | undefined>; // env vars
  cwd: string; // current working directory
  workflowPath: string; // workflowfile absolute path
  workflowRelativePath: string; // workflow file path relative to cwd
  workflowCwd: string; // workflow cwd, absolute path
  options?: WorkflowOptions; // workflow options, formated by getDefaultWorkflowOptions
  result?: unknown; // last step result
  error?: unknown; // last step error
  ok?: boolean; // last step state, true if no error
  items: unknown[]; // trigger items
  item?: unknown; // trigger item
  itemIndex?: number; // trigger item index
  steps: Record<string | number, unknown>; // steps results
  stepIndex?: number; // current step index
  stepOkResults: Record<string | number, boolean>; // step ok status map
  stepErrors: Record<string | number, unknown>; // step errors
  state: unknown; // workflow custom state
}
```