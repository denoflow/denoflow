# Denoflow

[![Custom badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Fdep-count%2Fhttps%2Fdeno.land%2Fx%2Fdenoflow%2Fcli.ts)](https://deno.land/x/denoflow) [![Custom badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Fupdates%2Fhttps%2Fdeno.land%2Fx%2Fdenoflow%2Fcli.ts)](https://deno.land/x/denoflow) [![Custom badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fdeno-visualizer.danopia.net%2Fshields%2Fcache-size%2Fhttps%2Fdeno.land%2Fx%2Fdenoflow%2Fcli.ts)](https://deno.land/x/denoflow)

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
sources:
  - use: fetch
    args:
      - https://test.owenyoung.com/slim.json
    run: return ctx.result.json()
    itemsPath: hits
    key: objectID
    format: return ctx.item.title
    limit: 1
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
deno run --allow-read --allow-net --allow-write --allow-env --allow-run --unstable https://denopkg.com/denoflow/denoflow@main/cli.ts run
```

> It will scan the `workflows` directory and run all valid `.yml` files.


### RSS Feed to Discord Webhook Message

```bash
touch workflows/rss.yml
```

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
deno run --allow-read --allow-net --allow-write --allow-run --allow-env --unstable https://denopkg.com/denoflow/denoflow@main/cli.ts run
```

### Life Cycle 


1. `on?`: when to run the workflow, `Record<EventType,EventConfig>`, can be  `schedule` or `http`,`always`, default is `always`.
2. `sources?`: where to fetch the data, `Source[]`, can be one or more sources. Every source should return an array of items.
    1. `from`?: import ts/js script from `url` or `file path`  
    2. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `ctx.sources[index].result`
    3. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. The return value will be attached to `ctx.result` and `ctx.sources[index].result`
    4. `itemsPath`?: the path to the items in the result, like `hits` in `https://test.owenyoung.com/slim.json`
    5. `key`?: the key to identify the item, like `objectID` in `https://test.owenyoung.com/slim.json`, if not provided, will use `id`, denoflow will hash the id, then the same item with `id` will be skipped.
    6. `limit`, `number` limit the number of items of this source.
    7. `format`, `string`, every item will be call `format` function
    8. `cmd`?: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `ctx.sources[index].cmdResult`
3. `filter`? filter from all sources items, expected return a new items array. The result will be attached to the `ctx.items`
    1. `from`?: import ts/js script from `url` or `file path`  
    2. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function, the return value will be attached to `ctx.result` and `filter.result`
    3. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. the return value will be attached to `ctx.result` and `ctx.filter.result`
    4. `limit`?, limit the number of items
    5. `cmd`?: `string`, exec a shell command after all other task, the return value will be attached to `ctx.cmdResult` and `filter.cmdResult`

4. `steps`? the steps to run, `Step[]`, can be one or more steps.
    1. `from`?: import script from `url` or `file path`  
    2. `use`?: run `moduleName` from above `from` , or if `from` is not provided, run `globalFunction` like `fetch`, `args` will be passed to the function
    3. `run`?: run ts/js code, you can handle `use` result here. Return a result that can be stringified to json. the result will be attached to the `ctx.steps[index].result`
    4. `cmd`?: exec shell commands, will be run after `run`, the result will be attached to the `ctx.steps[index].cmdResult`

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
    run: console.log(ctx.item);
```

All `ctx` see [Context] in the following doc.

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

```typescript
// WorkflowOptions File Structure
export interface WorkflowOptions {
  general?: GeneralOptions;
  env?: Record<string, string | undefined>;
  // default: always
  on?: Record<EventType, EventOptions>;
  sources?: SourceOptions[];
  filter?: FilterOptions;
  steps?: StepOptions[];
}
// general: General Options
export interface GeneralOptions {
  sleep?: string | number;
  debug?: boolean;
}

// on:  Event Options
type EventOptions = ScheduleOptions | HttpOptions;
enum EventType {
  Schedule = "schedule",
  Http = "http",
  Always = "always", // default
}

// sources: Source Options
export interface SourceOptions extends FilterOptions {
  itemsPath?: string;
  limit?: number;
  key?: string;
  force?: boolean;
  format?: string;
}

// filter: FilterOptions Options
export interface FilterOptions extends StepOptions {
  limit?: number;
}

// step: StepOptionss Options
export interface StepOptions extends GeneralOptions {
  id?: string;
  from?: string;
  use?: string;
  args?: unknown[];
  run?: string;
  if?: string | boolean;
  env?: Record<string, string | undefined>;
  // run shell command
  cmd?: string;
  continueOnError?: boolean;
}

export interface StepResponse {
  result: unknown;
  ok: boolean;
  isRealOk: boolean;
  error?: unknown;
  cmdResult?: string;
  cmdCode?: number;
  cmdOk?: boolean;
  cmdError?: string;
}
// ctx: all ctx you may need
export interface PublicContext {
  env: Record<string, string | undefined>; // env vars
  cwd: string; // current working directory
  workflowPath: string; // workflowfile absolute path
  workflowRelativePath: string; // workflow file path relative to cwd
  workflowCwd: string; // workflow cwd, absolute path
  options?: GeneralOptions; // workflow general options, formated by getDefaultWorkflowOptionsOptions
  result?: unknown; // last step result
  error?: unknown; // last step error
  ok?: boolean; // last step state, true if no error
  isRealOk?: boolean; // last step real state, true if no error, when continueOnError is true, and step is error,  it will be false, but ok will be true
  state: unknown; // workflow state , write/read, change this value, can be persisted
  items: unknown[]; // sources/filter result items
  item?: unknown; // current item that being step handled
  itemIndex?: number; //  current item index that being step handled
  itemKey?: string; // current item unique key that being step handled
  sourceIndex?: number; // current source index , used in sources
  filter?: StepResponse; // filter result
  sources: Record<string | number, StepResponse>; // sources result
  steps: Record<string | number, StepResponse>; // steps results
  stepIndex?: number; // current step index
  cmdResult?: string;
  cmdCode?: number;
  cmdOk?: boolean;
  cmdError?: string;
}

// run workflow options
export interface RunWorkflowOptions extends GeneralOptions {
  force?: boolean;
  limit?: number;
  files?: string[];
}

// schedule options
export interface ScheduleOptions {
  every?: string;
}
// http options
export interface HttpOptions {
  resStatusCode?: number;
  resContentType?: string;
  resBody?: string;
}

```
