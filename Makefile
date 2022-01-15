.Phony: run json

run:
	deno run --allow-read --allow-net --allow-write --allow-run --unstable cli.ts run

json:
	deno run --allow-read --allow-net --allow-write --allow-env --allow-run --unstable cli.ts run json --force