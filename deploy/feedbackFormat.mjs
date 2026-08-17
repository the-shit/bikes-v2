/**
 * Ownership: player-feedback issue / Mattermost copy. Pure formatters.
 * Talks via: record objects from the farm. No HTTP here.
 */

export const PUBLIC_URL_DEFAULT = 'https://bikes-v2.jordanpartridge.us';

export function isTypedIntent(data) {
  return Boolean(
    data &&
      data.schema === 'bikes.v2.intent' &&
      Number(data.schemaVersion) === 1 &&
      typeof data.id === 'string' &&
      data.id.length > 0 &&
      (data.kind === 'player_feedback' || data.kind === 'feature_idea'),
  );
}

export function intentText(data) {
  if (typeof data.text === 'string' && data.text.trim()) {
    return data.text;
  }
  return String(data.message || '');
}

export function rideContextLine(data) {
  const ctx = data.context && typeof data.context === 'object' ? data.context : {};
  const bits = [];
  if (ctx.street) {
    bits.push(String(ctx.street));
  }
  const speed = ctx.speed ?? data.speed;
  if (speed != null) {
    bits.push(`${Math.round(Number(speed) * 3.6)} km/h`);
  }
  if (ctx.lat != null && ctx.lon != null) {
    bits.push(`${Number(ctx.lat).toFixed(5)}, ${Number(ctx.lon).toFixed(5)}`);
  } else {
    const pos = ctx.position || data.position;
    if (pos && pos.x != null) {
      bits.push(
        `xyz ${Number(pos.x).toFixed(1)}, ${Number(pos.y).toFixed(1)}, ${Number(pos.z).toFixed(1)}`,
      );
    }
  }
  if (ctx.pressure != null) {
    bits.push(`tires ${Math.round(Number(ctx.pressure) * 100)}%`);
  }
  const build = data.build || ctx.buildId;
  if (build) {
    bits.push(String(build));
  }
  return bits.length ? bits.join(' · ') : 'no ride context';
}

export function formatMattermostMessage(data, issue = null) {
  const name = data.name ? String(data.name).slice(0, 32) : 'Anonymous';
  const idea = data.featureIdea ? ' · **feature idea** (credit if shipped)' : '';
  const msg = intentText(data).slice(0, 2000);
  const lines = [
    `#### The F-Widget`,
    `**${name}**${idea}`,
    ``,
    `> ${msg.replace(/\n/g, '\n> ')}`,
    ``,
    `_${rideContextLine(data)}_`,
    `[bikes-v2.jordanpartridge.us](${PUBLIC_URL_DEFAULT})`,
  ];
  if (data.screenshotUrl) {
    lines.push(``, `Screenshot: ${data.screenshotUrl}`);
  }
  if (issue?.html_url) {
    lines.push(``, `GitHub: [#${issue.number}](${issue.html_url})`);
  }
  return lines.join('\n');
}

export function formatGitHubIssue(data) {
  const name = data.name ? String(data.name).slice(0, 32) : 'Anonymous';
  const msg = intentText(data).trim().slice(0, 2000);
  const idea = Boolean(data.featureIdea || data.kind === 'feature_idea');
  const short = msg.length > 72 ? `${msg.slice(0, 69)}…` : msg;
  const title = idea
    ? `[idea] ${short}`.slice(0, 100)
    : `[feedback] ${short}`.slice(0, 100);

  const labels = ['player-feedback'];
  if (idea) {
    labels.push('feature-idea');
  }
  if (/\b(bug|broken|crash|error|fix|doesn't work|does not work)\b/i.test(msg)) {
    labels.push('bug');
  }

  const body = [
    `## Player feedback`,
    ``,
    msg,
    ``,
    `---`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **From** | ${name} |`,
    `| **Feature idea** | ${idea ? 'yes — credit if shipped' : 'no'} |`,
    `| **Ride** | ${rideContextLine(data)} |`,
    `| **Build** | ${data.build || data.context?.buildId || 'unknown'} |`,
    `| **Received** | ${data.receivedAt || new Date().toISOString()} |`,
    `| **Source** | [bikes-v2.jordanpartridge.us](${PUBLIC_URL_DEFAULT}) |`,
  ];
  if (data.screenshotUrl) {
    body.push(``, `![ride](${data.screenshotUrl})`);
  }
  body.push(``, `_Auto-filed by the F-Widget_`);
  return { title, body: body.join('\n'), labels };
}

export function shouldFileGitHubIssue(data) {
  const msg = intentText(data).trim().toLowerCase();
  if (msg.length < 3) {
    return false;
  }
  if (
    msg.includes('smoke') ||
    msg.includes('deploy bot') ||
    msg === 'test' ||
    msg.startsWith('mattermost channel smoke')
  ) {
    return false;
  }
  return true;
}
