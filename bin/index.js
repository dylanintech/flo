#! /usr/bin/env node
import chalk from 'chalk';
import boxen from 'boxen';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers'
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ReadFileTool, SerpAPI } from "langchain/tools";
import { NodeFileStore } from "langchain/stores/file/node";
import inquirer from 'inquirer';
import open from 'open'; //new
import { argv } from 'process'; 
import { writeFile, readFile } from 'fs/promises'; //new
import { tmpdir } from 'os'; //new
import { join } from 'path'; //new -- added path import 
import { write } from 'fs';

dotenv.config();

// Function to write the user's state data
async function writeUserState(field, value) {
  const filePath = join(tmpdir(), 'userState.json');
  try {
    // Read the existing data
    let data = await readFile(filePath, 'utf8');
    data = JSON.parse(data);

    // Update the specific field
    data[field] = value;

    // Write the updated data back to the file
    return await writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, create a new one with the given field and value
      return await writeFile(filePath, JSON.stringify({ [field]: value }, null, 2));
    } else {
      // Other error, rethrow
      throw error;
    }
  }
}


//function to read the user's api key
async function readApiKey() {
  const filePath = join(tmpdir(), 'userState.json');
  try { 
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data).apiKey;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, which is fine
      return null;
    } else {
      // Other error, rethrow
      throw error;
    }
  }
}


//function to read the user's serp api key
async function readSerpApiKey() {
  const filePath = join(tmpdir(), 'userState.json');
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data).serpApiKey;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, which is fine
      return null;
    } else {
      // Other error, rethrow
      throw error;
    }
  }
}

//function to read the user's theme
async function readTheme() {
  const filePath = join(tmpdir(), 'userState.json');
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data).theme;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found, which is fine
      return null;
    } else {
      // Other error, rethrow
      throw error;
    }
  }
}


const monitorErrorsAndSend = async (agent, processToMonitor, processArgs, noWarnings) => {
    const command = spawn(processToMonitor, processArgs);
  
    command.stderr.on('data', async (data) => {
      if (noWarnings && !data.toString().includes("Error")) {
        return;
      }
      console.error(`error from the ${processToMonitor} process: ${data}`);
      //   console.log(`hmm, it seems that you've gotten an error. not to worry, flo is scanning your codebase...`);
      const theme = await readTheme();
      if (theme) {
        console.log(chalk.hex(theme)(`hmm, it seems that you've gotten an error. not to worry, flo is scanning your codebase...`));
      } else {
        console.log(chalk.hex('#7303c0')(`hmm, it seems that you've gotten an error. not to worry, flo is scanning your codebase...`));
      }
      try {
          const input = 
          `
          the user has received the following error in their terminal:
          ${data}
          please look through the user's codebase and figure out how to solve this error with the tools you have available. please make sure that the answer you provide is specific by scanning their javascript files for the code that is causing the error.
          if you do not need to perform a web search to figure out how to solve the error, don't perform a web search and simply describe how to solve this error.
          in any case do your absolute best to tell the user why they got the error and how to solve it based on the rest of their javascript codebase. remember to use the ReadFileTool to find the cause of the error in a user's codebase so that you can be useful!
          DO NOT ask the user to "locate" or "provide the content of" a file. find it yourself and read it using the ReadFileTool. read multiple files if necessary. the point is for YOU to do the work, NOT the user. try to find and read files as much as you need to. If a broken function is imported from another file, go to that file, find the function, read it, and figure out what's wrong with it. Locate all relevant files (and read them) YOURSELF please, don't ask the user to provide the content of a file because they can't.
          also make sure to actually help the user solve their problem by identifying some root cause and solving the error for them. try not to tell them how to avoid that error by simply patching it up, but rather explore why the error occurs and how to solve it. You will be operating in many different directories so the path to the file you need to read may be different each time. if a user tells you to search for 'package.json' look for the file in the directory you are currently working in.
          if you are told to look in a certain file with a certain file path, intelligently choose where to look for the file, if the path you're told to look in contains fragments of the base path, don't duplicate them, just look in the path you're given.  MAKE SURE that there is NO "/file:/" segment at the beginning of the file path when attempting to read a file, this will FAIL. If this segment is there, remove it. the "/file:/" segment is just there for the user to know that they are looking at a file path, but it is not necessary for you to read the file. For example, if the "file_path" key is something like  "file_path": "file:///path/to/file.js" then you would look for the file at "path/to/file.js" never keep the "file://" anywhere in the path.
          Remember, you have access to the files in the user's codebase so YOU can check the implementation of any function yourself! Also remember to NOT include any segment including the file keyword such as "/file:" when passing the "file_path" to the read_file's toolInput object. When you do that the system attempts to open a file with the 'file' keyword. However, this won't open: '/file:/path/to/file.js', while this will: '/path/to/file.js'. Use what you know about how files are accessed to intellegently format the file path you pass to the read_file tool so as to not cause any errors when attempting to open it.
          `;
        //   const response = await agent.call({ input });
        //   console.log(`flo says: ${response.output}`); 
        const response = await agent.call({ input });
        // console.log(`flo says: ${response.output}`);
        if (theme) {
          console.log(chalk.hex(theme)(`flo says: ${response.output}`));
        } else {
          console.log(chalk.hex('#7303c0')(`flo says: ${response.output}`));
        }
        // console.log(`you have used up ${user.numErrors} errors so far!`); //new
        const { answer } = await inquirer.prompt([
            {
                type: 'input',
                name: 'answer',
                message: 'do you have a follow-up question? (enter `nah` to escape, or type your question -- for now try to use absolute paths when describing files)',
            },
        ]);
        if (answer === 'nah') {
            return;
        }
        const followUpInput =
        `
        the user has a follow-up question:
        ${answer}
        please look through the user's codebase and figure out how to solve this error with the tools you have available. please make sure that the answer you provide is specific by scanning their javascript files for the code that is causing the error.
        if you do not need to perform a web search to figure out how to solve the error, don't perform a web search and simply describe how to solve this error.
        in any case do your absolute best to tell the user why they got the error and how to solve it based on the rest of their javascript codebase. remember to use the ReadFileTool to find the cause of the error in a user's codebase so that you can be useful!
        do NOT ask the user to "locate" or "provide the content of" a file. find it yourself and read it using the ReadFileTool. read multiple files if necessary. the point is for YOU to do the work, NOT the user. try to find and read files as much as you need to. If a broken function is imported from another file, go to that file, find the function, read it, and figure out what's wrong with it. Locate all relevant files (and read them) YOURSELF please, don't ask the user to provide the content of a file because they can't.
        also make sure to actually help the user solve their problem by identifying some root cause and solving the error for them. try not to tell them how to avoid that error by simply patching it up, but rather explore why the error occurs and how to solve it.  You will be operating in many different directories so the path to the file you need to read may be different each time. if a user tells you to search for 'package.json' look for the file in the directory you are currently working in. 
        if you are told to look in a certain file with a certain file path, intelligently choose where to look for the file, if the path you're told to look in contains fragments of the base path, don't duplicate them, just look in the path you're given. MAKE SURE that there is NO "/file:/" segment at the beginning of the file path when attempting to read a file, this will FAIL. If this segment is there, remove it. the "/file:/" segment is just there for the user to know that they are looking at a file path, but it is not necessary for you to read the file. For example, if the "file_path" key is something like  "file_path": "file:///path/to/file.js" then you would look for the file at "path/to/file.js" never keep the "file://" anywhere in the path.
        Remember, you have access to the files in the user's codebase so YOU can check the implementation of any function yourself! Also remember to NOT include any segment including the file keyword such as "/file:" when passing the "file_path" to the read_file's toolInput object. When you do that the system attempts to open a file with the 'file' keyword. However, this won't open: '/file:/path/to/file.js', while this will: '/path/to/file.js'. Use what you know about how files are accessed to intellegently format the file path you pass to the read_file tool so as to not cause any errors when attempting to open it. 
        `;
        const followUpResponse = await agent.call({ input: followUpInput });
        // console.log(`flo says: ${followUpResponse.output}`);
        if (theme) {
          console.log(chalk.hex(theme)(`flo says: ${followUpResponse.output}`));
        } else {
          console.log(chalk.hex('#7303c0')(`flo says: ${followUpResponse.output}`));
        }
      } catch (error) {
          console.error(error);
      }
    });
};

const main = async () => {
    const store = new NodeFileStore("/"); //changed from "/" to basePath

    const argv = yargs(hideBin(process.argv)) //if this doesn't work then do const y = yargs();
      .scriptName('flo')
      .usage('Usage: \$0 <command> [options]')
      .command('monitor <process>', 'Monitor a process for errors', (builder) => {
        return builder.positional('process', {
          describe: 'Process to monitor',
          type: 'string',
        })
        .option('no-warnings', { //new
          alias: 'nw',
          describe: 'prevent flo from picking up on warnings, so that it only picks up on errors',
          type: 'boolean', // or 'string', 'number', etc. depending on your needs
      }).option('gpt-4', {
        alias: 'g4',
        describe: 'use gpt-4 instead of gpt-3.5-turbo. make sure that your openai account has access to gpt-4 before using this option, otherwise flo will fail!',
        type: 'boolean',
      }).option('search-enabled', {
        alias: 'se',
        describe: 'enable web search. this will allow flo to search the web for answers to user questions if necessary. keep in mind that you need to have the SERP api key configured for this to work. you can easily do this by running `flo login` and entering your serp api key when prompted.',
        type: 'boolean',
      })
      }, async (argv) => {
        const apiKey = await readApiKey();
        console.log('you requested for the following process to be monitored:', argv.process)
        const parts = argv.process.split(' ');
        const command = parts[0];
        const args = parts.slice(1);
        let model;
        let tools;
        if (apiKey) {
          if (argv.gpt4) {
            model = new ChatOpenAI({ temperature: 0.5, openAIApiKey: apiKey, modelName: 'gpt-4-0613' });
          } else {
            model = new ChatOpenAI({ temperature: 0.5, openAIApiKey: apiKey, modelName: 'gpt-3.5-turbo-0613' });
          }
          if (argv.searchEnabled) {
            const serpApiKeyInFile = await readSerpApiKey();
            if (serpApiKeyInFile) {
              tools = [
                new ReadFileTool({ store }),
                new SerpAPI(serpApiKeyInFile, {
                    location: "San Francisco,California,United States",
                    hl: "en",
                    gl: "us",
                }),
              ];
            } else {
              console.log("it looks like you've enabled web searching but haven't added your serp api key yet. pls run `flo login` and enter your serp api key when prompted.")
            }
          } else {
            tools = [
              new ReadFileTool({ store }),
            ];
          }
          const executor = await initializeAgentExecutorWithOptions(tools, model, {
              agentType: "openai-functions",
              returnIntermediateSteps: true,
              // verbose: true,
          });
          await monitorErrorsAndSend(executor, command, args, argv.noWarnings); //added argv.noWarnings boolean
        } else {
          console.log("it seems like your api key wasn't found. maybe try running `flo login` to log in and then try again?");
        }
      })
      .command('error [message]', 'Discuss an error message', (builder) => {
        return builder.positional('message', {
          describe: 'Error message that you are getting (for now try to use absolute paths when describing files)',
          type: 'string',
          default: '',
        }).option('gpt-4', {
          alias: 'g4',
          describe: 'use gpt-4 instead of gpt-3.5-turbo. make sure that your openai account has access to gpt-4 before using this option, otherwise flo will fail!',
          type: 'boolean',
        }).option('search-enabled', {
          alias: 'se',
          describe: 'enable web search. this will allow flo to search the web for answers to user questions if necessary. keep in mind that you need to have the SERP api key configured for this to work. you can easily do this by running `flo login` and entering your serp api key when prompted.',
          type: 'boolean',
        })
      }, async (argv) => {
        const apiKey = await readApiKey();
        try {
            const theme = await readTheme();
            const input = 
            `
            the user is struggling with the following error:
            ${argv.message}
            please look through the user's codebase and figure out how to solve this error with the tools you have available. make sure that the answer you provide is specific by scanning their javascript files for the code that is causing the error if necessary.
            if you do not need to perform a web search to figure out how to solve the error, don't perform a web search and simply describe how to solve this error.
            in any case do your absolute best to tell the user why they got the error and how to solve it based on the rest of their javascript codebase.
            do NOT ask the user to "locate" or "provide the content of" a file. find it yourself and read it using the ReadFileTool. read multiple files if necessary. the point is for YOU to do the work, NOT the user. try to find and read files as much as you need to. If a broken function is imported from another file, go to that file, find the function, read it, and figure out what's wrong with it. Locate all relevant files (and read them) YOURSELF please, don't ask the user to provide the content of a file because they can't.
            also make sure to actually help the user solve their problem by identifying some root cause and solving the error for them. try not to tell them how to avoid that error by simply patching it up, but rather explore why the error occurs and how to solve it.  You will be operating in many different directories so the path to the file you need to read may be different each time. if a user tells you to search for 'package.json' look for the file in the directory you are currently working in. 
            if you are told to look in a certain file with a certain file path, intelligently choose where to look for the file, if the path you're told to look in contains fragments of the base path, don't duplicate them, just look in the path you're given.  MAKE SURE that there is NO "/file:/" segment at the beginning of the file path when attempting to read a file, this will FAIL. If this segment is there, remove it. the "/file:/" segment is just there for the user to know that they are looking at a file path, but it is not necessary for you to read the file. For example, if the "file_path" key is something like  "file_path": "file:///path/to/file.js" then you would look for the file at "path/to/file.js" never keep the "file://" anywhere in the path.
            Remember, you have access to the files in the user's codebase so YOU can check the implementation of any function yourself! Also remember to NOT include any segment including the file keyword such as "/file:" when passing the "file_path" to the read_file's toolInput object. When you do that the system attempts to open a file with the 'file' keyword. However, this won't open: '/file:/path/to/file.js', while this will: '/path/to/file.js'. Use what you know about how files are accessed to intellegently format the file path you pass to the read_file tool so as to not cause any errors when attempting to open it. 
            `;
            if (theme) {
              console.log(chalk.hex(theme)(`flo is scanning your codebase to figure out how to solve this goofy error...`));
            } else {
              console.log(chalk.hex('#7303c0')(`flo is scanning your codebase to figure out how to solve this goofy error...`));
            }
            let model;
            let tools;
            if (apiKey) {
              if (argv.gpt4) {
                model = new ChatOpenAI({ temperature: 0.5, openAIApiKey: apiKey, modelName: 'gpt-4-0613' });
              } else {
                model = new ChatOpenAI({ temperature: 0.5, openAIApiKey: apiKey, modelName: 'gpt-3.5-turbo-0613' });
              }
              if (argv.searchEnabled) {
                const serpApiKeyInFile = await readSerpApiKey();
                if (serpApiKeyInFile) {
                  tools = [
                    new ReadFileTool({ store }),
                    new SerpAPI(serpApiKeyInFile, {
                        location: "San Francisco,California,United States",
                        hl: "en",
                        gl: "us",
                    }),
                  ];
                } else {
                  console.log("it looks like you've enabled web searching but haven't added your serp api key yet. pls run `flo login` and enter your serp api key when prompted.")
                }
              } else {
                tools = [
                  new ReadFileTool({ store }),
                ];
              }
              const executor = await initializeAgentExecutorWithOptions(tools, model, {
                  agentType: "openai-functions",
                  returnIntermediateSteps: true,
                  // verbose: true,
              });
              const response = await executor.call({ input });
              // console.log(`flo says: ${response.output}`);
              if (theme) {
                console.log(chalk.hex(theme)(`flo says: ${response.output}`));
              } else {
                console.log(chalk.hex('#7303c0')(`flo says: ${response.output}`));
              }
              const { answer } = await inquirer.prompt([
                  {
                      type: 'input',
                      name: 'answer',
                      message: 'do you have a follow-up question? (enter `nah` to escape, or type your question -- for now try to use absolute paths when describing files)',
                  },
              ]);
              if (answer === 'nah') {
                  return;
              }
              const followUpInput =
              `
              the user has a follow-up question:
              ${answer}
              please look through the user's codebase and figure out how to solve this error with the tools you have available. please make sure that the answer you provide is specific by scanning their javascript files for the code that is causing the error if necessary.
              if you do not need to perform a web search to figure out how to solve the error, don't perform a web search and simply describe how to solve this error.
              in any case do your absolute best to tell the user why they got the error and how to solve it based on the rest of their javascript codebase.
              do NOT ask the user to "locate" or "provide the content of" a file. find it yourself and read it using the ReadFileTool. read multiple files if necessary. the point is for YOU to do the work, NOT the user. try to find and read files as much as you need to. If a broken function is imported from another file, go to that file, find the function, read it, and figure out what's wrong with it. Locate all relevant files (and read them) YOURSELF please, don't ask the user to provide the content of a file because they can't.
              also make sure to actually help the user solve their problem by identifying some root cause and solving the error for them. try not to tell them how to avoid that error by simply patching it up, but rather explore why the error occurs and how to solve it.  You will be operating in many different directories so the path to the file you need to read may be different each time. if a user tells you to search for 'package.json' look for the file in the directory you are currently working in. 
              if you are told to look in a certain file with a certain file path, intelligently choose where to look for the file, if the path you're told to look in contains fragments of the base path, don't duplicate them, just look in the path you're given.  MAKE SURE that there is NO "/file:/" segment at the beginning of the file path when attempting to read a file, this will FAIL. If this segment is there, remove it. the "/file:/" segment is just there for the user to know that they are looking at a file path, but it is not necessary for you to read the file. For example, if the "file_path" key is something like  "file_path": "file:///path/to/file.js" then you would look for the file at "path/to/file.js" never keep the "file://" anywhere in the path.
              Remember, you have access to the files in the user's codebase so YOU can check the implementation of any function yourself! Also remember to NOT include any segment including the file keyword such as "/file:" when passing the "file_path" to the read_file's toolInput object. When you do that the system attempts to open a file with the 'file' keyword. However, this won't open: '/file:/path/to/file.js', while this will: '/path/to/file.js'. Use what you know about how files are accessed to intellegently format the file path you pass to the read_file tool so as to not cause any errors when attempting to open it. 
              `;
              const followUpResponse = await executor.call({ input: followUpInput });
              // console.log(`flo says: ${followUpResponse.output}`);
              if (theme) {
                console.log(chalk.hex(theme)(`flo says: ${followUpResponse.output}`));
              } else {
                console.log(chalk.hex('#7303c0')(`flo says: ${followUpResponse.output}`));
              }
            } else {
              console.log("it seems like your api key wasn't found. maybe try running `flo login` to log in and then try again?");
            }
        } catch (error) {
            console.error('error in error command callback:', error);
        }
        console.log("Received error message to discuss: " + argv.message);
      }).command('configure', 'configure some env variables to start using flo!', async (argv) => {
        try {
            const { hasKey } = await inquirer.prompt([
              {
                type: 'input',
                name: 'hasKey',
                message: "do you have an openai api key? you're gonna need it to use flo! (enter `nah` for no, enter anything else for yes)",
              },
            ]);
            if (hasKey === 'nah') {
              const { wantsBrowserToOpen } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'wantsBrowserToOpen',
                  message: 'do you want to open the browser to get your openai api key? (enter `nah` to escape, enter anything else to open your browser)',
                },
              ]);
              if (wantsBrowserToOpen === 'nah') {
                return;
              } else {
                open('https://platform.openai.com/account/api-keys');
              }
            }
            const { apiKey } = await inquirer.prompt([
              {
                type: 'input',
                name: 'apiKey',
                message: 'please enter your openai api key here (we NEVER store your api key in a database/server. verify this for yourself on github!):'
              },
            ]);
            if (apiKey === 'nah') {
              return;
            } else {
              // await writeApiKey(apiKey);
              await writeUserState('apiKey', apiKey);
              const apiKeyInFile = await readApiKey();
              if (apiKey === apiKeyInFile) {
                console.log('sick! you can start using flo now :)');
              } else {
                console.log('oh no, it looks like something went wrong while adding your api key, mind trying again?');
              }
            }
            //ask for the user's serp api key
            const { configureSerpKey } = await inquirer.prompt([
              {
                type: 'input',
                name: 'configureSerpKey',
                message: "do you want to add your serp api key? this is completely optional but you would need it if you wanna enable web searching (enter `nah` for no, enter anything else for yes)",
              },
            ]);
            if (configureSerpKey === 'nah') { //fix this
              return;
            } else {
              //ask if the user has a serp api key
              const { hasSerpKey } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'hasSerpKey',
                  message: "do you already have a serp api key? (enter `nah` for no, enter anything else for yes)",
                },
              ]);
              if (hasSerpKey === 'nah') {
                const { wantsBrowserToOpen } = await inquirer.prompt([
                  {
                    type: 'input',
                    name: 'wantsBrowserToOpen',
                    message: 'do you want to open the browser to get your serp api key? (enter `nah` to escape, enter anything else to open your browser)',
                  },
                ]);
                if (wantsBrowserToOpen === 'nah') {
                  return;
                } else {
                  open('https://serpapi.com/manage-api-key');
                }
              }
              const { serpApiKey } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'serpApiKey',
                  message: 'please enter your serp api key here. we NEVER store your api keys in a database/server. verify this for yourself on github! (enter `nah` to cancel):'
                },
              ]);
              if (serpApiKey === 'nah') {
                return;
              } else {
                // await writeSerpApiKey(serpApiKey);
                await writeUserState('serpApiKey', serpApiKey);
                const serpApiKeyInFile = await readSerpApiKey();
                if (serpApiKey === serpApiKeyInFile) {
                  console.log('sick! you can now enable web searching by adding the --search-enabled flag to any command :)');
                } else {
                  console.log('oh no, it looks like something went wrong while adding your serp api key, mind trying again?');
                }
              }
          }
        } catch (error) {
          console.error('error in login command callback:', error);
        }
      })
      .command('set-theme [theme]', 'set the color of the flocli output (make sure to pass a valid hex value)', (builder) => {
        return builder.positional('theme', {
          describe: 'the color of the flocli output (make sure to pass a valid hex value)',
          type: 'string',
          default: '#7303c0',
        })
      }, 
        async (argv) => {
         try {
          await writeUserState('theme', argv.theme);
          const newTheme = await readTheme();
          if (newTheme === argv.theme) {
            console.log(chalk.hex(newTheme)(`let's go, your new theme has been successfully set!`));
          } else {
            console.log('oh no, it looks like something went wrong while setting your theme, mind trying again?');
          }
        } catch (error) {
          console.error('error in set-theme command callback:', error);
        }
      })
       
      .demandCommand(1, '') // At least 1 command is required
      .recommendCommands()
      .help()
      .version('1.0.0')
      .argv;

    //   if (!argv._ || !argv._[0]) {
    //       yargs.showHelp(); 
    //   }
    // if (!argv._ || argv._.length === 0) {
    //     yargs.parse('_ help');
    // }
};

const runMain = async () => {
    try {
        await main();
    } catch (error) {
        console.error(error);
    }
}

runMain(); 