# welcome to flo - the cli tool that solves errors for you!
**flo** uses a [langchain](https://js.langchain.com/docs/) functions agent to catch errors thrown from processes that you're running in your dev environment. it then attempts to solve these errors or at least find out what's wrong by *scanning* your codebase for the faulty code. 

since flo "lives" in your codebase, it doesn't need you to provide any context. it also doesn't need you to copy + paste a super long error message anywhere, flo catches your erros and parses them on it's own!

to ensure **scalability** and **security** i decided to make this cli tool open-source and ask users to run flo with their own api keys.

enough intros, let's start catching some errors :)

## usage
## getting started
so the first thing you're gonna wanna do is install the `flocli` package via npm:
```bash
npm install -g flocli
```
**make sure to add that -g flag, if you don't add it the package will install but the cli commands won't work!**

once it's installed you're gonna wanna run the `configure` command to configure flo with your api key(s):
```bash
flo configure
```
this will prompt you to enter your openai (required) and serpapi (optional) api keys. if you don't have one of these, it'll open the browser for you so that you can get them (serpapi is optional like i said)

*optional*
if you would like you can also change the color of flo's terminal output by running the `set-theme` command and passing it a valid hexadecimal color value (make sure the hex value is wrapped in quotes):
```bash
flo set-theme "0x00ff00"
```
once you've configured flom you're ready to start catching some errors!
### monitoring
so the way flo **monitoring** works is that flo will spawn whatever child process you tell it to. if the process you attempt to monitor is already running, flo will simply restart it so that it can be monitored. if the process you attempt to monitor is not running, flo will start it and then monitor it.

to start monitoring a process, you can run the `monitor` command and pass it the command for executing the process you would like to monitor:
```bash
flo monitor "node index.js"
```
this will run the script located at `index.js`. if the script throws an error, flo will catch it and attempt to solve it for you automatically.

there are some flags you can pass to the `monitor` command to customize how flo monitors your process.

the first one is the `--no-warnings` flag (--nw for short). this will prevent flo from picking up on any warnings that your process throws, so that flo only focuses on errors. continuing with the example above, you would run the `monitor` command with the `--no-warnings` flag like so:
```bash
flo monitor "node index.js" --no-warnings=true
```

the next flag is `--gpt-4` (--g4 for short). this will make flo use gpt-4 rather than gpt-3.5-turbo. *make sure your openai api key has access to gpt-4 before using this flag, otherwise flo will fail*
```bash
flo monitor "node index.js" --gpt-4=true
```

finally, you can give flo web-search capabilities by passing it the `--search-enabled` (or --se) flag. this will allow flo to search the web (via the Serp API) for solutions to your errors if necessary. *make sure you ahve configured flo with your serp api key (you can do so via `flo config`), otherwise flo will fail.*
```bash
flo monitor "node index.js" --search-enabled=true
```

of course, you can combine these flags however you want:
```bash
flo monitor "node index.js" --no-warnings=true --gpt-4=true --search-enabled=true
```
### error messages
sometimes, the error you're getting is just not being output by the process for some reason. in these cases you can simply pass whatever error message to flo via the `error` command:
```bash
flo error "this is an error message"
```
this command will not spawn any process but it will scan your codebase to search for the root cause of your error and solve it. all of the flags that you can pass to the `monitor` command can also be passed to the `error` command. the **only exception** is the `--no-warnings` flag, since the `error` command doesn't monitor any process, it doesn't need to know whether or not to pick up on warnings.:
```bash
flo error "this is an error message" --gpt-4=true --search-enabled=true
```
## notes
*flo is still at a pretty early stage and i've built this version in a couple days, so the file reading/accessing can fail at times. to prevent this try to reference files by their absolute paths rather than relative paths to ensure that flo looks for your file in the right place, otherwise flo will throw an ENOENT error lol. for example, saying 'package.json' will probably fail but saying 'Users/myname/app/package.json' will not.*

*for now please remember to explictly set the flags to true when you want to use them. for example, use `--gpt-4=true` rather than `--gpt-4`. this is the only way i got the flags to operate correctly.*

*note that flo can monitor different kinds of processes, not just node scripts. for example, you can run a next.js app like so*:
```bash
flo monitor "npm run dev"
```
*this npm package should also be in the "0.x.x" version/semver range but when i first pushed it i set it to "1.0.0"*

**also, if you ever get any weird errors/things aren't working for you feel free to just shoot me an [email](mailto:dylanmolinabusiness@gmail.com)**

## credits
thanks to [openai](https://openai.com/) for their awesome work in AI/ML lol, it's been awesome seeing all the things being built on top of their API recently. Also thank you to [serpapi](https://serpapi.com/) for helping bring search capabilites to AI. last but def not least, thanks to [langchain](https://js.langchain.com/docs/) for their work in bringing AI app development to the masses.
