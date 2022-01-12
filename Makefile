.Phony: run s d

run:
	deno run --allow-read --allow-net --allow-write --unstable cli.ts run --filter example/workflows/hn-to-json/raw.yml

fetch:
	deno run --allow-read --allow-net --allow-write --allow-env --unstable cli.ts run --filter example/workflows/hn-to-json/fetch.yml
s:
	deno run --allow-net experiment/script.ts
d:
	deno run --allow-net experiment/deno-deploy.ts