// Gets an Azure DevOps bearer token by running the profile's token command.
// The token is returned to the caller only: never printed, logged or written to disk.

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

export async function getToken(profile, run = (cmd, args) => execFile(cmd, args, { maxBuffer: 1 << 20 })) {
  const [cmd, ...args] = profile.tokenCommand;
  let out;
  try {
    out = await run(cmd, args);
  } catch {
    out = null; // the error may echo stdout, so it is dropped on purpose
  }
  const token = out && String(out.stdout || '').trim();
  if (!token) throw new Error(`Could not get an Azure DevOps token for ${profile.name}. Sign in with az login and try again.`);
  return token;
}
