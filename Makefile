.Phony: run json

run:
	deno run --allow-read --allow-net --allow-write --unstable cli.ts run

json:
	deno run --allow-read --allow-net --allow-write --allow-env --unstable cli.ts run json --force