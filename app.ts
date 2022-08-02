import * as github from '@actions/github';
import * as core from '@actions/core';

interface FileLines {
  start: number;
  end: number
}

export interface ModifiedFile {
  name: string;
  deletion?: FileLines[];
  addition?: FileLines[];
}


async function run() {
  const base = github.context.payload.pull_request.base.sha;
  const head = github.context.payload.pull_request.head.sha;

  const client = github.getOctokit(core.getInput('token', {required: true}));
  const response = await client.repos.compareCommits({
    base,
    head,
    owner: github.context.repo.owner,
    github.context.repo.repo
  });

  const files = response.data.files;
  const modifiedFilesWithModifiedLines = files.map(parseFile);
  console.log(modifiedFilesWithModifiedLines);
  
}

function parseFile(file: {filename: string, patch?: string|undefined}): ModifiedFile {
  const modifiedFile: ModifiedFile = {
    name: file.filename
  };
  if (file.patch) {
    // The changes are included in the file
    const patches = file.patch.split('@@').filter((_, index) => index % 2); // Only take the line information and discard the modified code
    for (const patch of patches) {
      // patch is usually like " -6,7 +6,8"
      try {
        const hasAddition = patch.includes('+');
        const hasDeletion = patch.includes('-');
        if (hasAddition) {
          const lines = patch.match(/\+.*/)![0].trim().slice(1).split(',').map(num => parseInt(num)) as [number, number];
          modifiedFile.addition ??= [];
          modifiedFile.addition?.push({
            start: lines[0],
            end: lines[0] + lines[1],
          });
        }
        if (hasDeletion) {

          const lines = patch.split('+')[0].trim().slice(1).split(',').map((num) => parseInt(num)) as [number, number];
          modifiedFile.deletion ??= [];
          modifiedFile.deletion?.push({
            start: lines[0],
            end: lines[0] + lines[1],
          });
        }

      } catch (error) {
        console.log(`Error getting the patch of the file:\n${error}`);
      }
    }
  } else {
    // Take the all file
    modifiedFile.addition = [{
        start: 0,
        end: Infinity,
    }];
    modifiedFile.deletion = [{
        start: 0,
        end: Infinity,
    }];
  }
  return modifiedFile;
}

run ()