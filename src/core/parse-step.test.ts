import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { parseStep } from "./parse-step.ts";
import { Context } from "./interface.ts";
// Simple name and function, compact form, but not configurable
Deno.test("template #1", () => {
  const result = parseStep({
    use: "./to-json.ts",
    args: [
      "${{JSON.stringify(item)}}",
      '{"test":1}',
      1,
      "test",
      "test-${{item.created_at}}",
      {
        name: "${{item.created_at}}",
        obj: "${{item}}",
        json: "${{JSON.stringify(item)}}",
      },
      { names: ["test1"] },
    ],
  }, {
    item: {
      "created_at": "2022-01-12T05:56:04.000Z",
      "title": "State of Machine Learning in Julia",
      "url":
        "https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385",
      "author": "agnosticmantis",
      "points": 107,
      "story_text": null,
      "comment_text": null,
      "num_comments": 9,
      "story_id": null,
      "story_title": null,
      "story_url": null,
      "parent_id": null,
      "created_at_i": 1641966964,
      "_tags": [
        "story",
        "author_agnosticmantis",
        "story_29902846",
        "front_page",
      ],
      "objectID": "29902846",
      "_highlightResult": {
        "title": {
          "value": "State of Machine Learning in Julia",
          "matchLevel": "none",
          "matchedWords": [],
        },
        "url": {
          "value":
            "https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385",
          "matchLevel": "none",
          "matchedWords": [],
        },
        "author": {
          "value": "agnosticmantis",
          "matchLevel": "none",
          "matchedWords": [],
        },
      },
    },
  } as Context);
  // console.log("result", JSON.stringify(result));

  assertEquals(result, {
    "use": "./to-json.ts",
    "args": [
      '{"created_at":"2022-01-12T05:56:04.000Z","title":"State of Machine Learning in Julia","url":"https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385","author":"agnosticmantis","points":107,"story_text":null,"comment_text":null,"num_comments":9,"story_id":null,"story_title":null,"story_url":null,"parent_id":null,"created_at_i":1641966964,"_tags":["story","author_agnosticmantis","story_29902846","front_page"],"objectID":"29902846","_highlightResult":{"title":{"value":"State of Machine Learning in Julia","matchLevel":"none","matchedWords":[]},"url":{"value":"https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385","matchLevel":"none","matchedWords":[]},"author":{"value":"agnosticmantis","matchLevel":"none","matchedWords":[]}}}',
      '{"test":1}',
      1,
      "test",
      "test-2022-01-12T05:56:04.000Z",
      {
        "name": "2022-01-12T05:56:04.000Z",
        "obj": {
          "created_at": "2022-01-12T05:56:04.000Z",
          "title": "State of Machine Learning in Julia",
          "url":
            "https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385",
          "author": "agnosticmantis",
          "points": 107,
          "story_text": null,
          "comment_text": null,
          "num_comments": 9,
          "story_id": null,
          "story_title": null,
          "story_url": null,
          "parent_id": null,
          "created_at_i": 1641966964,
          "_tags": [
            "story",
            "author_agnosticmantis",
            "story_29902846",
            "front_page",
          ],
          "objectID": "29902846",
          "_highlightResult": {
            "title": {
              "value": "State of Machine Learning in Julia",
              "matchLevel": "none",
              "matchedWords": [],
            },
            "url": {
              "value":
                "https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385",
              "matchLevel": "none",
              "matchedWords": [],
            },
            "author": {
              "value": "agnosticmantis",
              "matchLevel": "none",
              "matchedWords": [],
            },
          },
        },
        "json":
          '{"created_at":"2022-01-12T05:56:04.000Z","title":"State of Machine Learning in Julia","url":"https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385","author":"agnosticmantis","points":107,"story_text":null,"comment_text":null,"num_comments":9,"story_id":null,"story_title":null,"story_url":null,"parent_id":null,"created_at_i":1641966964,"_tags":["story","author_agnosticmantis","story_29902846","front_page"],"objectID":"29902846","_highlightResult":{"title":{"value":"State of Machine Learning in Julia","matchLevel":"none","matchedWords":[]},"url":{"value":"https://discourse.julialang.org/t/state-of-machine-learning-in-julia/74385","matchLevel":"none","matchedWords":[]},"author":{"value":"agnosticmantis","matchLevel":"none","matchedWords":[]}}}',
      },
      { "names": ["test1"] },
    ],
  });
});
