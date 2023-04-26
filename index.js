const fetch = require('cross-fetch');
const core = require('@actions/core');
const github = require('@actions/github');

if (!String.prototype.format) {
	String.prototype.format = function(dict) {
		return this.replace(/{(\w+)}/g, function(match, key) {
			return typeof dict[key] !== 'undefined' ? dict[key] : match;
		});
	};
}

async function changeComment() {
	core.setOutput('applied', false);

	const refRE = new RegExp(core.getInput('ref-template'));
	const ref = github.context.ref;
	core.info(`ref: ${ref}`);
	const refMatcher = ref.match(refRE);
	if (refMatcher === null) {
		core.info(`Reference '${ref}' does not match template '${refRE}', silently ignoring`);
		return;
	}

	const comment = core.getInput('comment');
	const status = core.getInput('status');
	const vote = core.getInput('vote').split(/(\s+)/).filter(e => e.trim().length > 0);
	const notify = core.getInput('notify');
	const gerritEnvironments = JSON.parse(core.getInput('gerrit-environments', true));
	const gerritEnvironment = gerritEnvironments[refMatcher.groups.environment] || gerritEnvironments.default || null;
	if (gerritEnvironment === null) {
		throw new Error(`Cannot find environment '${refMatcher.groups.environment}' not 'default' in environments`);
	}

	const gerritUrl = `${gerritEnvironment.url}/a/changes/${refMatcher.groups.change.replace(/#/g, "~")}/revisions/${refMatcher.groups.revision}/review`
	const runUrl = `${github.context.payload.repository.html_url}/actions/runs/${github.context.runId}`;

	const review = {
		message: comment.format({
			environment: refMatcher.groups.environment,
			runUrl: runUrl,
			status: status,
			workflow: github.context.workflow,
			job: github.context.job,
		}),
		notify: notify,
		labels: {},
	};

	vote.forEach(e => {
		const [exp_status, exp] = e.split(':')
		const [label, score] = exp.split('=');

		if (exp_status === '*' || exp_status === status) {
			review.labels[label] = parseInt(score);
		}
	});

	core.info(`review: ${gerritUrl} ${JSON.stringify(review)}`);
	const response = await fetch(gerritUrl, {
		method: 'POST',
		headers: {
			'Authorization': gerritEnvironment.authorization,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		redirect: 'follow',
		body: JSON.stringify(review),
	});
	core.info(`status=${response.status} body=${await response.text()}`);
	core.setOutput('applied', true);
}

function main() {
	try {
		switch (core.getInput('type')) {
			default:
				throw new Error(`Unsupported type ${core.getInput('type')}`);
			case 'change-comment':
				changeComment();
				break;
		}
	} catch (error) {
		core.setFailed(error.message);
	}
}

main();
