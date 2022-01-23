.Phony: run json test s

run:
	deno run --allow-read --allow-net --allow-write --allow-run --allow-env cli.ts run

json:
	deno run --allow-read --allow-net --allow-write --allow-env --allow-run --unstable cli.ts run json --force
dry:
	deno run --allow-read --allow-write --allow-env --allow-net cli.ts run permission
test:
	deno test -A
s:
	deno run --allow-read --allow-net --allow-write --allow-env --allow-run --unstable cli.ts run workflows/script.yml --force