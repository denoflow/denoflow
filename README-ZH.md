# Denoflow

[![Discord](https://img.shields.io/discord/932645476413628446?color=7289DA&label=Join%20Community)](https://discord.gg/vHmBgqvA)

## Table of Contents

- [关于](#about)
- [快速开始](#getting_started)
- [如何使用](#usage)
- [常见问题](#faq)

## About <a name = "about"></a>

Denoflow是一个简单、强大、无服务器的自动化工作流工具，基于[`yaml`](https://yaml.org/)配置文件和[Deno](https://deno.land/)，你可以使用任何Deno模块、Typescript/Javascript代码来运行你的工作流。Denoflow会按照你的要求执行你的工作流程。

> 项目仍处于非常早期的阶段，谨慎使用!

理想的结果是拥有一些UI界面，使用[rjsf](https://github.com/rjsf-team/react-jsonschema-form)等json schema语言来渲染界面的工具生成一个web gui，gui可以帮助我们生成yaml配置。

理想的运行环境是使用云无服务器平台，或CI平台，如[Github Actions](https://github.com/features/actions)，[Gitlab CI](https://gitlab.com/gitlab-org/gitlab-ci-runner/)，使用[Deno](https://deno.land/)自我托管，或任何Docker运行时。

> [Deno Deploy](https://deno.com/deploy) 目前还不支持，因为Deno Deploy不支持运行字符串生成的代码。

> 查看Github Actions的作为运行时的例子： [test.yml](./.github/workflows/test.yml)

> 加入[Discord](https://discord.gg/vHmBgqvA)聊天频道，讨论Denoflow!

> 稳定的Deno Land的版本见[Denoflow](https://deno.land/x/denoflow)

## 能做什么？

- 比如做一个Github Webhook来在服务器同步部署最新代码
- 比如监听RSS的更新，发送到Telegram或者Discord等
- 以及其他一切可以通过API互相调用的流程

## 在线体验

现在可以通过[Online Playground](https://playground.owenyoung.com)来在线尝试和探索 Denoflow

## 为什么是Deno?

- Deno使用URL来导入模块，给了我们非常灵活和方便的工作流脚本功能，让我门可以非常容易地使用任何想要的模块。
- Deno基于JavaScript语言的现代特性，官方提供了一个标准库，涵盖了工作流中的大部分常用功能。
- Deno默认的零权限设计，这对工作流的安全性很重要，这样你就可以只给你的工作流提供它们需要的权限。

> 我之前写过[actionsflow](https://actionsflow.github.io/)，必须在github actions中运行，或者本地启用Docker运行，实际上经验来说，这对于大多数人想要的轻量级工作流来说太重了，我发现Deno的特性使得它非常适合做基于yaml配置的灵活工作流。所以，Denoflow的设计特别轻量，甚至没有常驻的功能，必须由外部的东西去运行它，比如github actions的trigger，或者无服务器的定时触发，http触发等。

## 先决条件

先安装[Deno]（https://deno.land/#installation）。

## Getting Started <a name = "getting_started"></a>

从Hacker News的API获取数据，发送到某个webhook的示例：

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

打开: <https://requestbin.com/r/enyvb91j5zjv9/23eNPamD4DK4YK1rfEB1FAQOKIj> , 查看实时的webhook请求

```bash
deno run --allow-read --allow-net --allow-write --allow-env --allow-run https://deno.land/x/denoflow/cli.ts run
```

> 或者简单点，直接给予所有权限（不建议生产环境这样做）：`deno run -A https://deno.land/x/denoflow/cli.ts run`

> Denoflow默认将扫描`workflows`目录并运行所有有效的`.yml`文件。

> Denoflow的仓库最新版本：`https://denopkg.com/denoflow/denoflow@main/cli.ts`。

> 你也可以[在线体验该示例](https://playground.owenyoung.com/)

如果你更喜欢用`fetch`：

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

> 在 [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMswb2QMxgBcoALFVZAQwgHMFyL1kTDCAHBAek8LkIDoQAdxgA7AJ7hRNflBABbTsAA2AS3n8AVqFENkEMKNwQikUciiEAHvxPAwygdpCiAFAEo9q3vOAAFSkISXBJvYD0AaxhxXBAAI00YSwBJABE9NXlvXABGRGBeDlxyDAMjCxdQZRh+ZRAaVwBybxh5RoAaSxsWjUJvavcAbnIAYmQAeTYxXAAeFnYuThMARzA+ONVRWQUlzjFxADc4gE4czQBWAC9NA+POACYAZhgAOQD5VIAWVIBpT4BNH45CB4ACiACEcgAxACCAEVxj9kpoAHzIdrIADKMBgyDUB1xIjiJBAIAi+hgqz4-BKmGwuAIxDIjGodCQjFQGHmRW4+yOpwu11u-BsbFUUwAJiZKBpREROHpOch5EQSRLcH5xpiACqKigkGCUCUwCD0DkcxoAYRcvFEhDQ2vEU0auEalDYbDUUECqhcnGcokaetQcRAEpiyAAJABvaMAKUx4xe-AKEE2NFUeHEri6-B67gAvgXEEA) 体验该实例

## RSS Feed to Discord Webhook Message

发送RSS源最新文章到Discord频道消息的示例：

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

> 在[Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMgZhEBbeyAFgC7EAOCA9JQCYwB2IAdADYCG9NlAHrQyJhYgA7gAEADE0kAmAIyVQkWMEoRgwJsWApUyNhADmCHbvRFSFeNTZRiASxD1ggkUwN3ihMACMmDysRwxGhkbAYwlIT0aGoa3LgsJsgsdrgeBLJJmCDQMATEEGAwiMCBljoYhfQEUI6gLDCsIAYAFADkHjC4bQA0ttx+gbgAlBXIYMB5WDDEUIRJAMTIAPJkDAQAPCTkVKowAI5Fpd529Ey1uKqUDACeAG7eAJyyAFYArABeL3ePlNIAzDAAHIABTYuAAIgAWCEAaShAE1YbIIJgAKIAIVkADEAIIARWWsIAki8AHzIHrIADKMBgyTsd3pwhg3kIIBAAGtkBADkdiEweTAyOxYMgbuAIMgWWyOdzCDBeUkGHckKZUBDidSAMLLABKEIA+gB1TEACWWRII20s1FuD2e7y+PyYAzIdjWNF54KY9BmlCS+iMavVGAAJABvCP9JgqpianX6o2mjEWokAX3TSVQGFwM3ZNAIIOW1IAKtndAq2HQ1CH1bptY5AvRgqWbmsCGwyCK7FA2PZHJQXqB6BXUN4QDQbgRIxHkAApanLIFMUoQU7uTA3FrRpsMYjwGOdXCaDwNJh3NgsIrp4bITOIIA)上尝试


或者，如果你更喜欢原生一点的方法:

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

> 在 [Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMswb2QMxgBcoALFVZAQwgHMFyL1kTDCAHBAek8qkIEsQAO2B4ANiADuAOhr9CJMACNpgzoTiE0bSjRicSQtBGDBpADwC2YhsghghuAD63UUYcEJ3TyALxVJSnlkfks2EAhCAAoAIhZ2Lk4AExghEGkxSiEkznNOE2BOSxAk6UJgGIBKAG5XZHcRLysxPwCgrz5zaQg4MDFCMphzaJq6hs98GBgk1spA4ILpHRMYADEppKjm0cZUHsJIIUnp6VTCCH44WsYxUPlcAEZETxgOJFQMLBxJ4jJGAGJkAB5NipXAAHnib24PQAjmBNEp+EJpO5LPlOKkAJ4ANyUAE4HgArACsAC8iTj8ZwAEwAZhgADkAAqUSwAEQALOyANKcgCaPIeEDwAFEAEIPVYAQQAikCeQBJIkAPmQABpkABlKbIW44mDISQwJQkEAgADWdhg8M00mtbEysGQWPAECNJrNluYMB6tlSOPeu3Ziq1AGEgQAldkAfQA6hKABJAhW4KGJbF4wmkilUixLfigpI9NnSIRETi2ah0IOMDAAEgA3o3OqchDjpCHw1HYwnxcmFQBfQd1DCWIhmpK4ZlArUAFTqqBIMEoKRMtd2qDDwg0Qi0c6xoNwlDYjv4UEoAmEnCJoCEi+QShKWNwTcbyAAUlqgYzpJ4LkIch4FiUQtjuZzwK28gwJYZTyGIMDSDilBiAig6VMgw5AA)尝试该示例

一个简单的通过脚本生成数据的例子:

```yaml
sources:
  - run: return [{id:"1"}]
    force: true
steps: 
  - run: console.log("item",ctx.item);
```

> 在[Online Playground](https://playground.owenyoung.com/#code=M4ewrgTgxgpsBcAoABMgtMiYB29MwBdJtkBtAbwEsATeAIgEY6BfAXRVWQDMRoY8CWGImAEYABwTIOGLLmRQQ2UABsYAOhUgA5gAo6lMQFs6AGigEAHusMwjASgDciIA)尝试该示例

更多的例子在[workflows](./workflows)目录下，你也可以在这里提交你的工作流

### 生命周期 

1. `sources?`：获取数据的地方，`Source[]`，可以是一个或多个来源。每个源都应该返回一个对象数组,比如`[{"id":"1"}]`，item的key可以通过`key`指定
    1. `from`? : 从`url`或`file path`里导入ts/js脚本。 
    1. `use`? : 从上面的`from`中运行`moduleName`，或者如果没有提供`from`的话，比如`fetch`，将会被当作全局函数，`args`数组将被传递给函数作为参数，返回值将被附加到`ctx.result`和`ctx.sources[index].result`，如果`use`是一个Class类，那么`ctx.result`将是该类的实例。 `use`也可以是`Deno.cwd`的东西，用来调用Deno提供的函数。
    1. `run`? ：运行ts/js代码，你可以在这里处理`use`结果。返回一个可以被字符串化为json的结果。返回值将被附加到`ctx.result`和`ctx.sources[index].result`。
    1. `itemsPath`? : 结果中对象数组的路径，如`https://test.owenyoung.com/slim.json`中将是`hits`。
    1. `key`? : 识别对象的唯一key，如`https://test.owenyoung.com/slim.json`中的`objectID`，如果不提供，将使用`id`，denoflow将对id进行去重。
    1. `reverse?', `boolean', 是否需要反向排序数组
    1. `filter?`, `string`, 脚本代码，应处理`ctx.item`，并且返回`true`或`false`。
    1. `cmd`: `string`, 在所有其他任务之后执行一个shell命令，返回值将附加到`ctx.cmdResult`和`ctx.sources[index].cmdResult`。
    1. `post?`：后置脚本代码，你可以在这里做一些检查、清理的事情，或者改变`ctx.state`。
1. `filter`? 从所有合并的sources的`items`中过滤，应该处理`ctx.items`，预期返回一个新的`boolean[]`。
    1. `from`? : 从`url`或`file path`导入ts/js脚本。 
    1. `use`? : 从上面的`from`中运行`moduleName`，或者如果没有提供`from`的话，比如`fetch`，将会被当作全局函数，`args`数组将被传递给函数作为参数，返回值将被附加到`ctx.result`和`ctx.sources[index].result`，如果`use`是一个Class类，那么`ctx.result`将是该类的实例。 `use`也可以是`Deno.cwd`的东西，用来调用Deno提供的函数。
    1. `run`？：运行ts/js代码，你可以在这里处理`use`的结果。处理`ctx.items`，预期返回一个新的`boolean[]`，标志哪个项目将被使用。例如，`run: return ctx.items.map(item => item.title.value.includes('test'))`。
    1. `cmd`? : `string`，在所有其他任务之后执行一个shell命令，返回值将被附加到`ctx.cmdResult`和`filter.cmdResult`。
    1. `post?`：后置脚本代码，你可以在这里做一些检查、清理，改变ctx.state的事情。
1. `steps`? 要运行的步骤，`Step[]`，可以是一个或多个步骤。
    1. `from`? : 从`url`或`file path`导入脚本。 
    1. `use`? : 从上面的`from`中运行`moduleName`，或者如果没有提供`from`的话，比如`fetch`，将会被当作全局函数，`args`数组将被传递给函数作为参数，返回值将被附加到`ctx.result`和`ctx.sources[index].result`，如果`use`是一个Class类，那么`ctx.result`将是该类的实例。 `use`也可以是`Deno.cwd`的东西，用来调用Deno提供的函数。
    1. `run`? : 运行ts/js代码，你可以在这里处理`use`结果。返回一个可以被字符串化为json的结果。该结果将被附加到`ctx.step[index].result`中。
    1. `cmd`? : 执行shell命令，将在`run`之后运行，结果将被附加到`ctx.step[index].cmdResult`。
    1. `post?`：后置脚本代码，你可以在这里做一些检查、清理的事情，改变ctx.state
1. `post`? 最后的后脚本代码，在所有步骤完成后运行，你可以在这里做一些检查、清洁的事情。你可以在这里使用所有`steps`里的的参数。

### Installing

你也可以直接把Denoflow安装到本机：

```bash
deno install -n denoflow --allow-read --allow-net --allow-write --allow-run --allow-env  https://deno.land/x/denoflow/cli.ts
```

然后就可以使用 `denoflow run` , 或者 `denoflow run <files>`来运行你的工作流文件。


#### Update to latest version

更新到最新版本：

```bash
deno cache --reload https://deno.land/x/denoflow/cli.ts
```

## Usage <a name = "usage"></a>

命令行参数：

```bash
denoflow/0.0.17

Usage:
  $ denoflow run [...files or url]

Options:
  --force Force run workflow files, if true, will ignore to read/save state
  --debug Debug mode, will print more info
  --database Database uri, default json://data
  --limit max items for workflow every runs
  --sleep sleep time between sources, filter, steps, unit seconds
  --stdin read yaml file from stdin, e.g. cat test.yml | denoflow run --stdin
  -h, --help Display this message
```



### YAML Syntax

YAML语法：

如果你还不熟悉YAML语法的话，可以花[5分钟](https://www.codeproject.com/Articles/1214409/Learn-YAML-in-five-minutes)熟悉一下：

你可以在任何字段中使用`${{variable}}`来向你的工作流插入变量，我们在所有可以使用脚本的地方都注入了`ctx`全局变量，利用ctx去访问任何需要的数据，比如说：

#### Expressions

```yaml
steps:
  - if: ${{ctx.items.lengh>10}}
    run: console.log(ctx.item);
```

所有的`ctx`变量，可以参考[接口配置文件](./src/core/interface.ts)

#### 状态

你可以简单地使用`ctx.state`来获取或设置状态，例如。

```js
let currentState = ctx.state || {};

let sent = ctx.state.send || [];

if(sent.includes(ctx.item.id)){
  sent.push（ctx.item.id）。
}

ctx.state = {
  sent
};

// denoflow将为你保存状态，接下来你可以读取它
```

默认配置，state将以`json`格式保存到`data`文件夹。你也可以使用sqlite来存储数据。在工作流配置文件中设置`database: sqlite://data.sqlite`即可

## Faq

### 如何运行一个定时工作流？

因为denoflow是为无服务器设计的，很简单，所以它本身不能运行定时工作流。但是你可以使用`cron`或其他触发器来触发Denoflow的工作流。比如说使用`cron`:

```bash
*/15 * * * deno run --allow-read --allow-net --allow-write --allow-env --allow-run https://deno.land/x/denoflow/cli.ts run workflows/schedule15.yml
```


### 如何处理webhook事件？

像上面一样，denoflow不能直接处理webhook，你可以把webhook转发给denoflow，比如使用github actions的例子。

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


> Denoflow还处于早期的阶段，如果你有任何建议，非常欢迎issue和pull request。谢谢！
