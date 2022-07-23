# Gerrit Action

This action enables gerrit integration.

## Inputs

See [action.yml](action.yml).

## Gerrit Replication Example

```ini
[remote]
	url = https://github.com/org1/org1-ci.git
	push = +refs/changes/*:refs/heads/gerrit/changes/*
	replicationDelay = 2
	allowManyToOneReplication = true
	projects = prefix/*
```

## Gerrit Environments Secret Example

```json
{
    "gerrit": {
        "url": "https://gerrit.xxx.com",
        "authorization": "Basic XXXXXXXXXXXXXX"
    }
}
```

## GitHub Workflow

```yaml
name: test

on:
  - push
  - pull_request

jobs:
  test:
    name: test
    runs-on: ubuntu-latest
    steps:
      - name: checkout
        uses: actions/checkout@v3
      - name: test
        run: |
          echo hello

  gerrit-action:
    needs:
      - test
    permissions:
      actions: read
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: technote-space/workflow-conclusion-action@v2
      - uses: alonbl/gerrit-action@master
        with:
          gerrit-environments: ${{ secrets.GERRIT_ENVS }}
          status: ${{ env.WORKFLOW_CONCLUSION }}
```
