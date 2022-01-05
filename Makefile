.Phony: run s d

run:
	deno run --allow-read --allow-net --unstable cli.ts run --filter example/workflows/rss-to-twitter.yml
s:
	deno run --allow-net experiment/script.ts
d:
	deno run --allow-net experiment/deno-deploy.ts